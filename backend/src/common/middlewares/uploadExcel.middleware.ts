import multer from 'multer';
import { AppError, ErrorCode } from '../errors/index.js';

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  if (allowed.includes(file.mimetype) || file.originalname.endsWith('.xlsx')) {
    cb(null, true);
  } else {
    cb(new AppError(400, 'Only .xlsx files are allowed', ErrorCode.EXCEL_INVALID_FORMAT));
  }
};

export const uploadExcel = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('file');
