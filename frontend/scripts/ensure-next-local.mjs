import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const localNodeModules = path.join(frontendRoot, 'node_modules');
const packageJsonPath = path.join(frontendRoot, 'package.json');
const nextBuildDir = path.join(frontendRoot, '.next');
const nextVersionMarker = path.join(nextBuildDir, '.codex-next-version');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const packageNames = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {}),
];

let created = 0;
let replaced = 0;
let missing = 0;

fs.mkdirSync(localNodeModules, { recursive: true });

const readPackageVersion = (packagePath) => {
  const packageJsonFile = path.join(packagePath, 'package.json');

  if (!fs.existsSync(packageJsonFile)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(packageJsonFile, 'utf8')).version ?? null;
  } catch {
    return null;
  }
};

for (const packageName of packageNames) {
  const packagePath = packageName.split('/');
  const localPackage = path.join(localNodeModules, ...packagePath);
  const rootPackage = path.join(repoRoot, 'node_modules', ...packagePath);

  if (!fs.existsSync(rootPackage)) {
    missing += 1;
    console.warn(`[predev] Không tìm thấy package ${packageName} ở node_modules root. Hãy chạy npm install trước.`);
    continue;
  }

  if (fs.existsSync(localPackage)) {
    const localVersion = readPackageVersion(localPackage);
    const rootVersion = readPackageVersion(rootPackage);

    if (!localVersion || !rootVersion || localVersion === rootVersion) {
      continue;
    }

    fs.rmSync(localPackage, { recursive: true, force: true });
    replaced += 1;
  }

  fs.mkdirSync(path.dirname(localPackage), { recursive: true });

  try {
    fs.symlinkSync(rootPackage, localPackage, process.platform === 'win32' ? 'junction' : 'dir');
    created += 1;
  } catch (error) {
    console.warn(`[predev] Không thể tạo liên kết local cho ${packageName}:`, error instanceof Error ? error.message : error);
  }
}

if (created > 0) {
  const replacedText = replaced > 0 ? `, thay ${replaced} package sai phiên bản` : '';
  console.log(`[predev] Đã tạo liên kết local cho ${created} package${replacedText} để Turbopack resolve đúng workspace.`);
} else if (missing === 0) {
  console.log('[predev] Các package local cho Turbopack đã sẵn sàng.');
}

const localNextPackage = path.join(localNodeModules, 'next');
const nextVersion = readPackageVersion(localNextPackage);
const previousNextVersion = fs.existsSync(nextVersionMarker)
  ? fs.readFileSync(nextVersionMarker, 'utf8').trim()
  : null;

if (nextVersion && previousNextVersion !== nextVersion && fs.existsSync(nextBuildDir)) {
  fs.rmSync(nextBuildDir, { recursive: true, force: true });
  console.log(`[predev] Đã xóa cache .next cũ vì Next đổi phiên bản (${previousNextVersion ?? 'chưa ghi nhận'} -> ${nextVersion}).`);
}

if (nextVersion) {
  fs.mkdirSync(nextBuildDir, { recursive: true });
  fs.writeFileSync(nextVersionMarker, nextVersion);
}
