import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Permission } from '../models/permission.model.js';
import { RolePermission } from '../models/rolePermission.model.js';
import { PermissionCode, ROLE_PERMISSIONS } from '../common/constants/permissions.js';
import { Role } from '../common/constants/roles.js';

export async function seedPermissions() {
  const allCodes = Object.values(PermissionCode);
  for (const code of allCodes) {
    await Permission.findOneAndUpdate({ code }, { code }, { upsert: true });
  }
  console.log(`  ✓ ${allCodes.length} permissions`);

  let count = 0;
  for (const role of Object.values(Role)) {
    const codes = ROLE_PERMISSIONS[role];
    for (const code of codes) {
      const perm = await Permission.findOne({ code });
      if (!perm) continue;
      await RolePermission.findOneAndUpdate(
        { role, permissionId: perm._id },
        { role, permissionId: perm._id },
        { upsert: true },
      );
      count++;
    }
  }
  console.log(`  ✓ ${count} role-permission mappings`);
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');
  await seedPermissions();
  await mongoose.disconnect();
  console.log('Done');
}

if (process.argv[1]?.includes('seedPermissions')) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
