'use client';
import { useState } from 'react';
import { FileText } from 'lucide-react';
import { usePublishedRegulations } from '@/features/regulations/api';
import { Card } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { TableSkeleton } from '@/components/common/Skeleton';
import type { Regulation } from '@/types/regulation';

export default function StudentRegulationsPage() {
  const [selected, setSelected] = useState<Regulation | null>(null);
  const { data, isLoading } = usePublishedRegulations();

  return (
    <div className="flex flex-col gap-6">
      {isLoading ? <div className="p-4"><TableSkeleton columns={3} rows={5} /></div> : (
        <Card>
          {(!data || data.length === 0) ? (
            <p className="text-text-secondary p-4 text-center">Chưa có nội quy nào được công bố.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-3 pr-4 font-medium w-1/4">Tiêu đề</th>
                  <th className="py-3 pr-4 font-medium w-1/2">Nội dung</th>
                  <th className="py-3 font-medium whitespace-nowrap text-right">Ngày công bố</th>
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr 
                    key={r._id} 
                    onClick={() => setSelected(r)} 
                    className="border-b border-border last:border-0 hover:bg-bg-page/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-4 align-top font-medium text-text-primary">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-primary shrink-0" />
                        <span>{r.title}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 align-top text-text-secondary">
                      <div className="line-clamp-2">{r.content}</div>
                    </td>
                    <td className="py-3 align-top whitespace-nowrap text-right text-text-secondary">
                      {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Chi tiết nội quy" size="lg">
        {selected && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-bold text-text-primary">{selected.title}</h3>
              {selected.publishedAt && (
                <p className="mt-1 text-sm text-text-secondary">
                  Ngày công bố: {new Date(selected.publishedAt).toLocaleDateString('vi-VN')}
                </p>
              )}
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-bg-page p-4 text-sm text-text-secondary whitespace-pre-line leading-relaxed">
              {selected.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
