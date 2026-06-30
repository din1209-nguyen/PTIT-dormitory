import { ActivityLog } from '../../models/activityLog.model.js';
import type { PaginationQuery } from '../../common/utils/pagination.js';

interface AuditFilters {
  userId?: string;
  action?: string;
  entityName?: string;
  startDate?: string;
  endDate?: string;
}

export async function list(pagination: PaginationQuery, filters: AuditFilters) {
  const query: Record<string, unknown> = {};
  if (filters.userId) query.userId = filters.userId;
  if (filters.action) query.action = filters.action;
  if (filters.entityName) query.entityName = filters.entityName;
  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filters.startDate) dateFilter.$gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.$lte = new Date(filters.endDate + 'T23:59:59.999Z');
    query.createdAt = dateFilter;
  }

  const [items, totalItems] = await Promise.all([
    ActivityLog.find(query)
      .populate('userId', 'username email role')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    ActivityLog.countDocuments(query),
  ]);

  return {
    items,
    pagination: { page: pagination.page, limit: pagination.limit, totalItems, totalPages: Math.ceil(totalItems / pagination.limit) },
  };
}
