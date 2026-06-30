import { ActivityLog } from '../../models/activityLog.model.js';
import { logger } from '../../config/logger.js';

export function logActivity(params: {
  userId?: string;
  action: string;
  entityName?: string;
  entityId?: string;
  description?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
}): void {
  ActivityLog.create(params).catch((err) => {
    logger.error('Failed to write activity log', { error: err });
  });
}
