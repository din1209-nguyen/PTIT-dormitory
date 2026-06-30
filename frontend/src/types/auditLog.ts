export interface ActivityLog {
  _id: string;
  userId: { _id: string; username: string; email?: string; role: string } | null;
  action: string;
  entityName?: string;
  entityId?: string;
  description?: string;
  ipAddress?: string;
  createdAt: string;
}
