'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, GraduationCap, CalendarDays, Building2,
  BedDouble, FileText, Bell, MessageSquare, Zap, CreditCard,
  AlertTriangle, BarChart3, Shield, ClipboardList,
  FileSpreadsheet, Shuffle, ChevronLeft, ChevronRight, History
} from 'lucide-react';
import type { Role } from '@/lib/auth/authStore';

interface NavItem {
  icon: React.ElementType;
  href: string;
  label: string;
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  ADMIN: [
    { icon: LayoutDashboard, href: '/admin/dashboard', label: 'Tổng quan' },
    { icon: Shield, href: '/admin/permissions', label: 'Phân quyền' },
    { icon: ClipboardList, href: '/admin/audit-logs', label: 'Nhật ký hệ thống' },
  ],
  MANAGER: [
    { icon: GraduationCap, href: '/manager/students', label: 'Quản lý sinh viên' },
    { icon: FileSpreadsheet, href: '/manager/import-excel', label: 'Nhập từ Excel' },
    { icon: CalendarDays, href: '/manager/semesters', label: 'Kỳ lưu trú' },
    { icon: Building2, href: '/manager/dormitories', label: 'Quản lý toà nhà' },
    { icon: Shuffle, href: '/manager/room-assignments', label: 'Xếp phòng' },
    { icon: History, href: '/manager/residence-history', label: 'Lịch sử lưu trú' },
    { icon: FileText, href: '/manager/regulations', label: 'Nội quy' },
    { icon: Bell, href: '/manager/notifications', label: 'Thông báo' },
    { icon: MessageSquare, href: '/manager/requests', label: 'Yêu cầu hỗ trợ' },
    { icon: AlertTriangle, href: '/manager/violations', label: 'Kỷ luật' },
    { icon: Zap, href: '/manager/utility-billing', label: 'Điện nước' },
    { icon: BarChart3, href: '/manager/reports', label: 'Báo cáo thống kê' },
  ],
  STUDENT: [

    { icon: GraduationCap, href: '/student/profile', label: 'Hồ sơ cá nhân' },
    { icon: BedDouble, href: '/student/room', label: 'Phòng của tôi' },
    { icon: History, href: '/student/residence-history', label: 'Lịch sử lưu trú' },
    { icon: FileText, href: '/student/regulations', label: 'Nội quy' },
    { icon: Bell, href: '/student/notifications', label: 'Thông báo' },
    { icon: MessageSquare, href: '/student/requests', label: 'Gửi yêu cầu' },
    { icon: CreditCard, href: '/student/bills', label: 'Thanh toán' },
  ],
};

export function Sidebar({ role, isExpanded, onToggle }: { role: Role; isExpanded?: boolean; onToggle?: () => void }) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role] || [];

  return (
    <aside className={`fixed left-0 top-0 z-40 flex h-full flex-col gap-2 rounded-r-[var(--radius-lg)] bg-bg-sidebar py-4 shadow-sm transition-all duration-300 ${isExpanded ? 'w-[240px] px-4' : 'w-[72px] items-center px-2'}`}>
      <div className="mb-4 flex items-center justify-center">
        <Link href="/" className="flex items-center justify-center">
          <Image src="/logo-ptit.png" alt="PTIT" width={48} height={48} className="shrink-0 rounded-full" />
        </Link>
      </div>

      <nav className={`flex flex-1 flex-col gap-1 ${isExpanded ? 'items-stretch' : 'items-center'} overflow-y-auto overflow-x-hidden no-scrollbar`}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={!isExpanded ? item.label : undefined}
              className={`flex items-center rounded-[var(--radius-sm)] transition-all overflow-hidden ${
                active
                  ? 'bg-gradient-to-br from-primary-from to-primary-to text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-page'
              } ${isExpanded ? 'h-10 px-3' : 'h-10 w-10 justify-center'}`}
            >
              <Icon size={20} className="shrink-0" />
              <span className={`truncate text-sm font-medium transition-all duration-300 ${isExpanded ? 'ml-3 max-w-[200px] opacity-100' : 'max-w-0 opacity-0 ml-0'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {onToggle && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-1/2 z-50 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg-card text-text-secondary shadow-sm transition-all hover:bg-bg-page hover:text-text-primary"
        >
          {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      )}
    </aside>
  );
}
