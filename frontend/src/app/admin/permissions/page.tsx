'use client';
import { Shield } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';

const PERMISSIONS = [
  { code: 'USER_READ', desc: 'Xem danh sách tài khoản', roles: ['ADMIN'] },
  { code: 'USER_CREATE', desc: 'Tạo tài khoản mới', roles: ['ADMIN'] },
  { code: 'USER_UPDATE', desc: 'Cập nhật tài khoản', roles: ['ADMIN'] },
  { code: 'USER_LOCK', desc: 'Khóa tài khoản', roles: ['ADMIN'] },
  { code: 'USER_UNLOCK', desc: 'Mở khóa tài khoản', roles: ['ADMIN'] },
  { code: 'PERMISSION_READ', desc: 'Xem quyền hệ thống', roles: ['ADMIN'] },
  { code: 'PERMISSION_MANAGE', desc: 'Quản lý phân quyền', roles: ['ADMIN'] },
  { code: 'STUDENT_READ', desc: 'Xem danh sách sinh viên', roles: ['MANAGER'] },
  { code: 'STUDENT_CREATE', desc: 'Tạo hồ sơ sinh viên', roles: ['MANAGER'] },
  { code: 'STUDENT_UPDATE', desc: 'Cập nhật sinh viên', roles: ['MANAGER'] },
  { code: 'STUDENT_IMPORT', desc: 'Import Excel sinh viên', roles: ['MANAGER'] },
  { code: 'SEMESTER_READ', desc: 'Xem học kỳ', roles: ['MANAGER'] },
  { code: 'SEMESTER_CREATE', desc: 'Tạo học kỳ', roles: ['MANAGER'] },
  { code: 'SEMESTER_ACTIVATE', desc: 'Kích hoạt học kỳ', roles: ['MANAGER'] },
  { code: 'SEMESTER_FINISH', desc: 'Kết thúc học kỳ', roles: ['MANAGER'] },
  { code: 'DORM_READ', desc: 'Xem KTX', roles: ['MANAGER'] },
  { code: 'DORM_CREATE', desc: 'Tạo dãy/tầng/phòng', roles: ['MANAGER'] },
  { code: 'ROOM_ASSIGNMENT_READ', desc: 'Xem xếp phòng', roles: ['MANAGER'] },
  { code: 'ROOM_ASSIGNMENT_AUTO', desc: 'Xếp phòng tự động', roles: ['MANAGER'] },
  { code: 'REGULATION_READ', desc: 'Xem nội quy', roles: ['MANAGER', 'STUDENT'] },
  { code: 'REGULATION_MANAGE', desc: 'Quản lý nội quy', roles: ['MANAGER'] },
  { code: 'REGULATION_PUBLISH', desc: 'Công bố nội quy', roles: ['MANAGER'] },
  { code: 'NOTIFICATION_READ', desc: 'Xem thông báo', roles: ['MANAGER', 'STUDENT'] },
  { code: 'NOTIFICATION_SEND', desc: 'Gửi thông báo', roles: ['MANAGER'] },
  { code: 'REQUEST_CREATE', desc: 'Tạo đơn từ', roles: ['STUDENT'] },
  { code: 'REQUEST_READ', desc: 'Xem đơn từ', roles: ['MANAGER', 'STUDENT'] },
  { code: 'REQUEST_UPDATE_STATUS', desc: 'Xử lý đơn từ', roles: ['MANAGER'] },
  { code: 'VIOLATION_READ', desc: 'Xem vi phạm', roles: ['MANAGER', 'STUDENT'] },
  { code: 'VIOLATION_CREATE', desc: 'Ghi nhận vi phạm', roles: ['MANAGER'] },
  { code: 'UTILITY_READ', desc: 'Xem điện nước', roles: ['MANAGER', 'STUDENT'] },
  { code: 'UTILITY_USAGE_CREATE', desc: 'Ghi chỉ số', roles: ['MANAGER'] },
  { code: 'UTILITY_BILL_CREATE', desc: 'Tạo hóa đơn', roles: ['MANAGER'] },
  { code: 'PAYMENT_CREATE', desc: 'Thanh toán', roles: ['STUDENT'] },
  { code: 'PAYMENT_READ', desc: 'Xem thanh toán', roles: ['MANAGER', 'STUDENT'] },
  { code: 'PAYMENT_CONFIRM_CASH', desc: 'Xác nhận tiền mặt', roles: ['MANAGER'] },
  { code: 'CONFIG_READ', desc: 'Xem cấu hình', roles: ['MANAGER'] },
  { code: 'CONFIG_UPDATE', desc: 'Cập nhật cấu hình', roles: ['MANAGER'] },
  { code: 'REPORT_READ', desc: 'Xem báo cáo', roles: ['ADMIN', 'MANAGER'] },
  { code: 'AUDIT_LOG_READ', desc: 'Xem nhật ký', roles: ['ADMIN'] },
];

export default function AdminPermissionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full bg-[#EDE9FE] px-3 py-1">
          <Shield size={14} className="text-[#7C3AED]" />
          <span className="text-xs font-semibold text-[#7C3AED]">{PERMISSIONS.length} quyền</span>
        </div>
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left text-text-secondary">
            <th className="py-3 pr-4 font-medium">Mã quyền</th>
            <th className="py-3 pr-4 font-medium">Mô tả</th>
            <th className="py-3 font-medium">Roles</th>
          </tr></thead>
          <tbody>
            {PERMISSIONS.map(p => (
              <tr key={p.code} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-mono text-xs">{p.code}</td>
                <td className="py-3 pr-4">{p.desc}</td>
                <td className="py-3">
                  <div className="flex gap-1">
                    {p.roles.map(r => <Badge key={r} value={r} />)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
