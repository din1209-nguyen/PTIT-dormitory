import { Regulation } from '../../models/regulation.model.js';
import { AppError, NotFoundError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import { RegulationStatus } from '../../common/constants/enums.js';

export async function listRegulations(filter: { status?: string }) {
  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  return Regulation.find(query).sort({ createdAt: -1 }).lean();
}

export async function listPublished() {
  return Regulation.find({ status: RegulationStatus.PUBLISHED }).sort({ publishedAt: -1 }).lean();
}

export async function getById(id: string) {
  const reg = await Regulation.findById(id).lean();
  if (!reg) throw new NotFoundError('Không tìm thấy nội quy', ErrorCode.INTERNAL_SERVER_ERROR);
  return reg;
}

export async function create(data: { title: string; content: string }, createdBy: string) {
  return Regulation.create({ ...data, status: RegulationStatus.DRAFT, createdBy });
}

export async function update(id: string, data: { title?: string; content?: string }) {
  const reg = await Regulation.findById(id);
  if (!reg) throw new NotFoundError('Không tìm thấy nội quy', ErrorCode.INTERNAL_SERVER_ERROR);
  if (reg.status === RegulationStatus.ARCHIVED) {
    throw new AppError(400, 'Không thể chỉnh sửa nội quy đã lưu trữ', ErrorCode.INTERNAL_SERVER_ERROR);
  }
  Object.assign(reg, data);
  await reg.save();
  return reg;
}

export async function publish(id: string, publishedBy: string) {
  const reg = await Regulation.findById(id);
  if (!reg) throw new NotFoundError('Không tìm thấy nội quy', ErrorCode.INTERNAL_SERVER_ERROR);
  reg.status = RegulationStatus.PUBLISHED;
  reg.publishedBy = publishedBy as unknown as typeof reg.publishedBy;
  reg.publishedAt = new Date();
  await reg.save();
  return reg;
}

export async function archive(id: string) {
  const reg = await Regulation.findById(id);
  if (!reg) throw new NotFoundError('Không tìm thấy nội quy', ErrorCode.INTERNAL_SERVER_ERROR);
  reg.status = RegulationStatus.ARCHIVED;
  await reg.save();
  return reg;
}
