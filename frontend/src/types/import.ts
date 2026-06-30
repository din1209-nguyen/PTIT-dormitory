export interface ImportBatch {
  _id: string;
  semesterId: { _id: string; name: string } | string;
  fileName?: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK';
  errorMessage?: string;
  createdAt: string;
  finishedAt?: string;
}

export interface ImportRowError {
  _id: string;
  importBatchId: string;
  rowNumber: number;
  fieldName?: string;
  errorMessage: string;
  rawData?: Record<string, string>;
}
