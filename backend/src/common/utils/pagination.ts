import type { Request } from 'express';

export interface PaginationQuery {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  keyword?: string;
}

export function parsePagination(req: Request, defaults?: { sortBy?: string }): PaginationQuery {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
  const sortBy = (req.query.sortBy as string) || defaults?.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';
  const keyword = (req.query.keyword as string) || undefined;

  return { page, limit, skip: (page - 1) * limit, sortBy, sortOrder, keyword };
}
