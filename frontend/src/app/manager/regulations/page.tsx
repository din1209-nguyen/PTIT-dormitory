'use client';
import { useState } from 'react';
import { Plus, Edit2, Globe, Archive } from 'lucide-react';
import { useRegulations, useCreateRegulation, useUpdateRegulation, usePublishRegulation, useArchiveRegulation } from '@/features/regulations/api';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { TableSkeleton } from '@/components/common/Skeleton';
import type { Regulation } from '@/types/regulation';

export default function RegulationsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Regulation | null>(null);
  const [viewing, setViewing] = useState<Regulation | null>(null);
  const { data, isLoading } = useRegulations();
  const createMut = useCreateRegulation();
  const updateMut = useUpdateRegulation();
  const publishMut = usePublishRegulation();
  const archiveMut = useArchiveRegulation();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = { title: fd.get('title') as string, content: fd.get('content') as string };
    if (editing) await updateMut.mutateAsync({ id: editing._id, data: body });
    else await createMut.mutateAsync(body);
    setModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4 flex flex-col sm:flex-row flex-wrap items-center gap-4">
          <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="shrink-0 gap-2"><Plus size={16} /> Tạo nội quy</Button>
        </div>
        {isLoading ? <div className="p-4"><TableSkeleton columns={3} rows={5} /></div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="py-3 pr-4 font-medium w-1/4">Tiêu đề</th>
                <th className="py-3 pr-4 font-medium w-1/3">Nội dung</th>
                <th className="py-3 pr-4 font-medium whitespace-nowrap">Trạng thái</th>
                <th className="py-3 pr-4 font-medium whitespace-nowrap text-right">Ngày cập nhật</th>
                <th className="py-3 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(r => (
                <tr 
                  key={r._id} 
                  onClick={() => { 
                    if (r.status === 'DRAFT') { setEditing(r); setModalOpen(true); } 
                    else { setViewing(r); }
                  }} 
                  className="border-b border-border last:border-0 hover:bg-bg-page/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 pr-4 align-top font-medium text-text-primary">{r.title}</td>
                  <td className="py-3 pr-4 align-top text-text-secondary">
                    <div className="line-clamp-2">{r.content}</div>
                  </td>
                  <td className="py-3 pr-4 align-top whitespace-nowrap"><Badge value={r.status} /></td>
                  <td className="py-3 pr-4 align-top whitespace-nowrap text-right text-text-secondary">
                    {new Date(r.updatedAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-3 align-top">
                    <div className="flex items-center justify-end gap-3">
                      {r.status === 'DRAFT' && (
                        <button onClick={(e) => { e.stopPropagation(); publishMut.mutate(r._id); }} className="text-text-secondary hover:text-accent-teal transition-colors" title="Công bố"><Globe size={16} /></button>
                      )}
                      {r.status === 'PUBLISHED' && (
                        <button onClick={(e) => { e.stopPropagation(); archiveMut.mutate(r._id); }} className="text-text-secondary hover:text-accent-red transition-colors" title="Lưu trữ"><Archive size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Sửa nội quy' : 'Tạo nội quy'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Tiêu đề" name="title" defaultValue={editing?.title} required />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Nội dung</label>
            <textarea name="content" defaultValue={editing?.content} required rows={6} className="w-full rounded-[var(--radius-sm)] border border-border bg-bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          <Button type="submit" className="mt-2">{editing ? 'Cập nhật' : 'Tạo'}</Button>
        </form>
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Chi tiết nội quy" size="lg">
        {viewing && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge value={viewing.status} />
                {viewing.publishedAt && (
                  <span className="text-sm text-text-secondary">
                    Đã công bố: {new Date(viewing.publishedAt).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-text-primary">{viewing.title}</h3>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-bg-page p-4 text-sm text-text-secondary whitespace-pre-line leading-relaxed">
              {viewing.content}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
