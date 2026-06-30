import {
  LayoutDashboard, GraduationCap, CalendarDays, Building2,
  BedDouble, FileText, Bell, MessageSquare, Zap, CreditCard,
  AlertTriangle, BarChart3, Shield, ClipboardList,
  FileSpreadsheet, Shuffle, Users, History
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PageInfo {
  title: string;
  icon: LucideIcon;
}

export const PAGE_CONFIG: Record<string, PageInfo> = {
  // Admin
  '/admin/dashboard': { title: 'Admin Dashboard', icon: LayoutDashboard },
  '/admin/users': { title: 'Quản lý tài khoản', icon: Users },
  '/admin/permissions': { title: 'Phân quyền hệ thống', icon: Shield },
  '/admin/audit-logs': { title: 'Nhật ký hoạt động', icon: ClipboardList },

  // Manager

  '/manager/students': { title: 'Quản lý sinh viên', icon: GraduationCap },
  '/manager/import-excel': { title: 'Import sinh viên đăng ký KTX', icon: FileSpreadsheet },
  '/manager/semesters': { title: 'Quản lý kỳ lưu trú', icon: CalendarDays },
  '/manager/dormitories': { title: 'Quản lý ký túc xá', icon: Building2 },
  '/manager/room-assignments': { title: 'Xếp phòng', icon: Shuffle },
  '/manager/residence-history': { title: 'Lịch sử lưu trú', icon: History },
  '/manager/regulations': { title: 'Quản lý nội quy', icon: FileText },
  '/manager/notifications': { title: 'Quản lý thông báo', icon: Bell },
  '/manager/requests': { title: 'Quản lý đơn từ', icon: MessageSquare },
  '/manager/violations': { title: 'Quản lý vi phạm', icon: AlertTriangle },
  '/manager/utility-billing': { title: 'Quản lý điện nước', icon: Zap },
  '/manager/reports': { title: 'Báo cáo thống kê', icon: BarChart3 },

  // Student

  '/student/profile': { title: 'Hồ sơ cá nhân', icon: GraduationCap },
  '/student/room': { title: 'Phòng của tôi', icon: BedDouble },
  '/student/residence-history': { title: 'Lịch sử lưu trú', icon: History },
  '/student/regulations': { title: 'Nội quy', icon: FileText },
  '/student/notifications': { title: 'Thông báo', icon: Bell },
  '/student/requests': { title: 'Gửi yêu cầu', icon: MessageSquare },
  '/student/bills': { title: 'Thanh toán', icon: CreditCard },
};

export function getPageInfo(pathname: string): PageInfo | null {
  if (PAGE_CONFIG[pathname]) return PAGE_CONFIG[pathname];
  
  const paths = Object.keys(PAGE_CONFIG).sort((a, b) => b.length - a.length);
  for (const p of paths) {
    if (pathname.startsWith(p)) return PAGE_CONFIG[p];
  }
  return null;
}
