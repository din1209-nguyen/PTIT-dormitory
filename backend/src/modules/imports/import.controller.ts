import type { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/response.js';
import { AppError, ErrorCode } from '../../common/errors/index.js';
import * as importService from './import.service.js';

export async function importExcel(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError(400, 'Chưa tải lên file', ErrorCode.EXCEL_INVALID_FORMAT);
  }
  if (!req.file.originalname.toLowerCase().endsWith('.xlsx')) {
    throw new AppError(400, 'File import phải có định dạng .xlsx', ErrorCode.EXCEL_INVALID_FORMAT);
  }

  const semesterId = req.body.semesterId as string;
  if (!semesterId) {
    throw new AppError(400, 'semesterId là bắt buộc', ErrorCode.VALIDATION_ERROR);
  }

  const isPreview = req.body.preview === 'true';
  const ignoreErrors = req.body.ignoreErrors === 'true';

  const result = await importService.importExcelAndAssign(
    req.file.buffer,
    req.file.originalname,
    semesterId,
    req.user!.id,
    { isPreview, ignoreErrors },
  );

  if (isPreview) {
    res.status(200).json({
      success: true,
      message: 'Preview dữ liệu',
      data: result,
    });
    return;
  }

  const statusCode = result.batch?.status === 'FAILED' ? 400 : 200;
  res.status(statusCode).json({
    success: result.batch?.status !== 'FAILED',
    message: result.batch?.status === 'SUCCESS' ? 'Import thành công' : 'Import thất bại do lỗi dữ liệu',
    data: result,
  });
}

export async function listBatches(req: Request, res: Response) {
  const data = await importService.listBatches(req.query.semesterId as string | undefined);
  sendSuccess(res, data);
}

export async function getBatchErrors(req: Request, res: Response) {
  const data = await importService.getBatchErrors(req.params.id as string);
  sendSuccess(res, data);
}
