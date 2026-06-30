import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export function sendSuccess(res: Response, data: unknown = null, message = 'Thành công', statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendCreated(res: Response, data: unknown = null, message = 'Tạo thành công'): void {
  sendSuccess(res, data, message, 201);
}

export function sendPaginated(
  res: Response,
  items: unknown[],
  pagination: PaginationMeta,
  message = 'Thành công',
): void {
  res.status(200).json({
    success: true,
    message,
    data: { items, pagination },
  });
}
