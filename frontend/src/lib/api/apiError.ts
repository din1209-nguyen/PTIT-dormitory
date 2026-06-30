export interface ApiErrorData {
  success: false;
  message: string;
  errorCode: string;
  errors?: { field: string; message: string }[];
}

export class ApiError extends Error {
  public errorCode: string;
  public errors?: { field: string; message: string }[];
  public status: number;

  constructor(status: number, data: ApiErrorData) {
    super(data.message);
    this.status = status;
    this.errorCode = data.errorCode;
    this.errors = data.errors;
  }
}
