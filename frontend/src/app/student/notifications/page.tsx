'use client';
import { useState, useMemo } from 'react';
import { Bell, Check } from 'lucide-react';
import { useMyNotifications, useMarkRead } from '@/features/notifications/api';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { TableSkeleton } from '@/components/common/Skeleton';
import { Modal } from '@/components/common/Modal';
import type { Notification } from '@/types/notification';

export default function StudentNotificationsPage() {
  const [filterScope, setFilterScope] = useState<'ALL' | 'GENERAL' | 'PRIVATE'>('ALL');
  const [selected, setSelected] = useState<Notification | null>(null);
  
  const { data, isLoading } = useMyNotifications();
  const markRead = useMarkRead();

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (filterScope === 'ALL') return data;
    return data.filter(n => n.scope === filterScope);
  }, [data, filterScope]);

  function handleRowClick(n: Notification) {
    if (!n.isRead) {
      markRead.mutate(n._id);
    }
    setSelected(n);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4 flex flex-col sm:flex-row flex-wrap items-center gap-4">
          <div className="flex bg-bg-page rounded-[var(--radius-md)] p-1 shrink-0">
            <button onClick={() => setFilterScope('ALL')} className={`px-3 py-1.5 font-medium text-sm rounded-[var(--radius-sm)] transition-colors ${filterScope === 'ALL' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Tất cả</button>
            <button onClick={() => setFilterScope('GENERAL')} className={`px-3 py-1.5 font-medium text-sm rounded-[var(--radius-sm)] transition-colors ${filterScope === 'GENERAL' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Thông báo chung</button>
            <button onClick={() => setFilterScope('PRIVATE')} className={`px-3 py-1.5 font-medium text-sm rounded-[var(--radius-sm)] transition-colors ${filterScope === 'PRIVATE' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Thông báo cá nhân</button>
          </div>
        </div>

        {isLoading ? <div className="p-4"><TableSkeleton columns={4} rows={5} /></div> : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="py-3 pr-4 font-medium w-1/4">Tiêu đề</th>
                <th className="py-3 pr-4 font-medium w-1/3">Nội dung</th>
                <th className="py-3 pr-4 font-medium">Phân loại</th>
                <th className="py-3 font-medium whitespace-nowrap text-right">Ngày gửi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-text-secondary">Không có thông báo nào</td></tr>
              )}
              {filteredData.map(n => (
                <tr key={n._id} onClick={() => handleRowClick(n)} className={`border-b border-border last:border-0 hover:bg-bg-page/50 cursor-pointer transition-colors ${n.isRead ? 'opacity-70' : 'font-medium'}`}>
                  <td className="py-3 pr-4 align-top text-text-primary">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className={`shrink-0 ${n.scope === 'GENERAL' ? 'text-primary' : 'text-status-warning-text'}`} />
                      <span className="line-clamp-1">{n.title}</span>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>}
                    </div>
                  </td>
                  <td className="py-3 pr-4 align-top text-text-secondary">
                    <div className="line-clamp-1">{n.content}</div>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <Badge value={n.scope} />
                  </td>
                  <td className="py-3 align-top text-right text-text-secondary whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Chi tiết thông báo" size="md">
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={selected.scope} />
              <span className="text-xs text-text-secondary">Ngày gửi: {new Date(selected.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
            <h4 className="font-semibold text-lg text-text-primary leading-tight">{selected.title}</h4>
            <div className="rounded-[var(--radius-md)] bg-bg-page p-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
              {selected.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
