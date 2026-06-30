'use client';

import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useAuditLogs } from '@/features/auditLogs/api';
import { useAdminDashboard } from '@/features/dashboard/api';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Pagination } from '@/components/common/Pagination';
import { Badge } from '@/components/common/Badge';
import { TableSkeleton } from '@/components/common/Skeleton';

const ACTION_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'LOGIN_SUCCESS', label: 'Đăng nhập' },
  { value: 'LOGIN_FAILED', label: 'Đăng nhập thất bại' },
  { value: 'CREATE', label: 'Tạo mới' },
  { value: 'UPDATE', label: 'Cập nhật' },
  { value: 'DELETE', label: 'Xóa' },
  { value: 'IMPORT_STUDENT', label: 'Import sinh viên' },
  { value: 'BILL_CREATE', label: 'Tạo hóa đơn' },
  { value: 'PAYMENT_CASH_CONFIRM', label: 'Xác nhận tiền mặt' },
  { value: 'VIOLATION_CREATE', label: 'Tạo vi phạm' },
  { value: 'CONFIG_UPDATE', label: 'Cập nhật cấu hình' },
];

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useAuditLogs({
    page,
    limit: 15,
    action: action || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: dashboardData, isLoading: isLoadingDashboard } = useAdminDashboard();

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-wrap items-end gap-4 p-4">
        <Select
          label="Hành động"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          options={ACTION_OPTIONS}
          className="w-44"
        />
        <Input
          label="Từ ngày"
          type="date"
          value={startDate}
          onChange={(event) => {
            setStartDate(event.target.value);
            setPage(1);
          }}
          className="w-40"
        />
        <Input
          label="Đến ngày"
          type="date"
          value={endDate}
          onChange={(event) => {
            setEndDate(event.target.value);
            setPage(1);
          }}
          className="w-40"
        />
        <div className="ml-auto mb-1 flex items-center gap-2 rounded-full bg-[#DBEAFE] px-3 py-1">
          <ClipboardList size={14} className="text-[#1D4ED8]" />
          <span className="text-xs font-semibold text-[#1D4ED8]">
            {isLoadingDashboard ? '...' : dashboardData?.recentLogs ?? 0} nhật ký 7 ngày
          </span>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton columns={7} rows={5} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="py-3 pr-4 font-medium">Thời gian</th>
                <th className="py-3 pr-4 font-medium">Người dùng</th>
                <th className="py-3 pr-4 font-medium">Vai trò</th>
                <th className="py-3 pr-4 font-medium">Hành động</th>
                <th className="py-3 pr-4 font-medium">Đối tượng</th>
                <th className="py-3 pr-4 font-medium">Mô tả</th>
                <th className="py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((log) => (
                <tr key={log._id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 whitespace-nowrap text-text-secondary">
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="py-3 pr-4">
                    {log.userId ? (
                      <span className="font-medium">{log.userId.username}</span>
                    ) : (
                      <span className="text-text-secondary">Hệ thống</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {log.userId ? <Badge value={log.userId.role} /> : <span className="text-text-secondary">-</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge value={log.action} />
                  </td>
                  <td className="py-3 pr-4 text-text-secondary">{log.entityName || '-'}</td>
                  <td className="max-w-xs truncate py-3 pr-4">{log.description || '-'}</td>
                  <td className="py-3 text-xs text-text-secondary">{log.ipAddress || '-'}</td>
                </tr>
              ))}
              {data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-secondary">
                    Không có nhật ký
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {data && data.pagination.totalPages > 1 && (
          <Pagination currentPage={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        )}
      </Card>
    </div>
  );
}
