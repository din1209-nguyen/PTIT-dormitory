import type { RequestHandler } from 'express';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Không tìm thấy đường dẫn',
    errorCode: 'ROUTE_NOT_FOUND',
  });
};
