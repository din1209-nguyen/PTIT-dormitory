import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { authenticate } from '../../common/middlewares/auth.middleware.js';
import { requirePermission } from '../../common/middlewares/permission.middleware.js';
import { PermissionCode } from '../../common/constants/index.js';
import { ElectricPriceTier } from '../../models/electricPriceTier.model.js';
import { sendSuccess, sendCreated } from '../../common/utils/response.js';
import { AppError } from '../../common/errors/index.js';
import { ErrorCode } from '../../common/errors/errorCodes.js';
import type { Request, Response } from 'express';

const router = Router();

router.get('/', authenticate, requirePermission(PermissionCode.CONFIG_READ), asyncHandler(async (_req: Request, res: Response) => {
  const tiers = await ElectricPriceTier.find().sort({ tierOrder: 1 }).lean();
  sendSuccess(res, tiers);
}));

function validateTier(body: any) {
  if (body.tierOrder <= 0) throw new AppError(400, 'Bậc phải lớn hơn 0', ErrorCode.VALIDATION_ERROR);
  if (body.fromKwh < 0) throw new AppError(400, 'Từ (kWh) phải lớn hơn hoặc bằng 0', ErrorCode.VALIDATION_ERROR);
  if (body.toKwh !== null && body.toKwh !== undefined && body.toKwh <= body.fromKwh) {
    throw new AppError(400, 'Đến (kWh) phải lớn hơn Từ (kWh)', ErrorCode.VALIDATION_ERROR);
  }
  if (body.unitPrice <= 0) throw new AppError(400, 'Đơn giá phải lớn hơn 0', ErrorCode.VALIDATION_ERROR);
}

router.post('/', authenticate, requirePermission(PermissionCode.CONFIG_UPDATE), asyncHandler(async (req: Request, res: Response) => {
  validateTier(req.body);
  const existing = await ElectricPriceTier.findOne({ tierOrder: req.body.tierOrder });
  if (existing) throw new AppError(409, 'Bậc giá đã tồn tại', ErrorCode.VALIDATION_ERROR);
  const tier = await ElectricPriceTier.create(req.body);
  sendCreated(res, tier);
}));

router.put('/bulk', authenticate, requirePermission(PermissionCode.CONFIG_UPDATE), asyncHandler(async (req: Request, res: Response) => {
  if (!Array.isArray(req.body)) throw new AppError(400, 'Dữ liệu không hợp lệ', ErrorCode.VALIDATION_ERROR);
  
  const tiers = req.body.map((t: any, index: number) => {
    if (!t.unitPrice || t.unitPrice <= 0) throw new AppError(400, `Đơn giá ở Bậc ${index + 1} phải lớn hơn 0`, ErrorCode.VALIDATION_ERROR);
    return {
      tierOrder: index + 1,
      toKwh: t.toKwh ? Number(t.toKwh) : null,
      unitPrice: Number(t.unitPrice),
      isActive: true,
      fromKwh: 0,
    };
  });

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (!tier) continue;
    if (i === 0) {
      tier.fromKwh = 0;
    } else {
      const prevTier = tiers[i - 1];
      if (!prevTier) throw new AppError(400, 'Dữ liệu không hợp lệ', ErrorCode.VALIDATION_ERROR);
      const prevTo = prevTier.toKwh;
      if (prevTo === null) throw new AppError(400, `Chỉ có Bậc cuối cùng mới được để trống (không giới hạn)`, ErrorCode.VALIDATION_ERROR);
      tier.fromKwh = prevTo;
      if (tier.unitPrice <= prevTier.unitPrice) {
        throw new AppError(400, `Đơn giá của Bậc ${i + 1} phải lớn hơn Bậc ${i}`, ErrorCode.VALIDATION_ERROR);
      }
    }
    if (tier.toKwh !== null && tier.toKwh <= tier.fromKwh) {
      throw new AppError(400, `Mốc Đến (kWh) của Bậc ${i + 1} phải lớn hơn mốc Từ (${tier.fromKwh})`, ErrorCode.VALIDATION_ERROR);
    }
  }

  await ElectricPriceTier.deleteMany({});
  const inserted = await ElectricPriceTier.insertMany(tiers);
  sendSuccess(res, inserted);
}));

router.put('/:id', authenticate, requirePermission(PermissionCode.CONFIG_UPDATE), asyncHandler(async (req: Request, res: Response) => {
  validateTier(req.body);
  if (req.body.tierOrder) {
    const existing = await ElectricPriceTier.findOne({ tierOrder: req.body.tierOrder, _id: { $ne: req.params.id } });
    if (existing) throw new AppError(409, 'Bậc giá đã tồn tại', ErrorCode.VALIDATION_ERROR);
  }
  const tier = await ElectricPriceTier.findByIdAndUpdate(req.params.id as string, req.body, { new: true, runValidators: true });
  if (!tier) throw new AppError(404, 'Bậc giá không tồn tại', ErrorCode.INTERNAL_SERVER_ERROR);
  sendSuccess(res, tier);
}));

export default router;
