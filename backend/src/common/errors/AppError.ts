import { ErrorCode } from './errorCodes.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly errors?: { field: string; message: string }[];

  constructor(
    statusCode: number,
    message: string,
    errorCode: ErrorCode,
    errors?: { field: string; message: string }[],
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy tài nguyên', errorCode = ErrorCode.INTERNAL_SERVER_ERROR) {
    super(404, message, errorCode);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'Dữ liệu không hợp lệ',
    errors?: { field: string; message: string }[],
  ) {
    super(400, message, ErrorCode.VALIDATION_ERROR, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Chưa đăng nhập', errorCode = ErrorCode.AUTH_UNAUTHORIZED) {
    super(401, message, errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Không có quyền truy cập', errorCode = ErrorCode.AUTH_FORBIDDEN) {
    super(403, message, errorCode);
  }
}
