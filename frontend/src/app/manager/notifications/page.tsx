'use client';
import { useState, useMemo } from 'react';
import { Bell, Send, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNotifications, useCreateGeneralNotification, useCreatePrivateNotification } from '@/features/notifications/api';
import { useStudents } from '@/features/students/api';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { TableSkeleton } from '@/components/common/Skeleton';
import { MultiSearchableSelect } from '@/components/common/SearchableSelect';
import { StudentDetailModal } from '@/features/students/components/StudentDetailModal';
import type { Notification, StudentSummary } from '@/types/notification';

export default function NotificationsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingNotification, setViewingNotification] = useState<Notification | null>(null);
  const [viewingStudent, setViewingStudent] = useState<StudentSummary | null>(null);
  const [scope, setScope] = useState<'GENERAL' | 'PRIVATE'>('GENERAL');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentKeyword, setStudentKeyword] = useState('');

  // UI states for Filter and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data, isLoading } = useNotifications();
  const createGeneral = useCreateGeneralNotification();
  const createPrivate = useCreatePrivateNotification();
  const { data: studentsData, isLoading: studentsLoading } = useStudents({ limit: 50, keyword: studentKeyword || undefined });

  const studentOptions = useMemo(() =>
    (studentsData?.items || []).map(s => ({ value: s._id, label: s.studentCode, sublabel: s.fullName })),
    [studentsData]
  );

  const { items: paginatedItems, totalPages } = useMemo(() => {
    if (!data) return { items: [], totalPages: 0 };

    let filtered = data;
    if (filterScope !== 'ALL') {
      filtered = filtered.filter(n => n.scope === filterScope);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      );
    }

    const maxPages = Math.ceil(filtered.length / itemsPerPage);
    // Ensure currentPage is valid if data changes
    const validPage = Math.min(currentPage, maxPages > 0 ? maxPages : 1);
    const startIndex = (validPage - 1) * itemsPerPage;
    const items = filtered.slice(startIndex, startIndex + itemsPerPage);

    return { items, totalPages: maxPages };
  }, [data, filterScope, searchQuery, currentPage]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = fd.get('title') as string;
    const content = fd.get('content') as string;
    try {
      if (scope === 'GENERAL') {
        await createGeneral.mutateAsync({ title, content });
      } else {
        if (selectedStudents.length === 0) {
          toast.error('Vui lòng chọn ít nhất một sinh viên');
          return;
        }
        await createPrivate.mutateAsync({ title, content, studentIds: selectedStudents });
      }
      setModalOpen(false);
      setSelectedStudents([]);
      toast.success('Gửi thông báo thành công');
    } catch (err) {
      toast.error((err as Error).message || 'Gửi thông báo thất bại');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4 flex flex-col sm:flex-row flex-wrap items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              className="w-full rounded-[var(--radius-pill)] border border-border bg-bg-page py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
              placeholder="Tìm kiếm thông báo..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex bg-bg-page rounded-[var(--radius-md)] p-1 shrink-0">
            <button onClick={() => { setFilterScope('ALL'); setCurrentPage(1); }} className={`px-3 py-1.5 font-medium text-sm rounded-[var(--radius-sm)] transition-colors ${filterScope === 'ALL' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Tất cả</button>
            <button onClick={() => { setFilterScope('GENERAL'); setCurrentPage(1); }} className={`px-3 py-1.5 font-medium text-sm rounded-[var(--radius-sm)] transition-colors ${filterScope === 'GENERAL' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Chung</button>
            <button onClick={() => { setFilterScope('PRIVATE'); setCurrentPage(1); }} className={`px-3 py-1.5 font-medium text-sm rounded-[var(--radius-sm)] transition-colors ${filterScope === 'PRIVATE' ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Riêng</button>
          </div>
          
          <Button onClick={() => setModalOpen(true)} className="ml-auto shrink-0 gap-2"><Send size={16} /> Tạo thông báo</Button>
        </div>

        {isLoading ? <div className="p-4"><TableSkeleton columns={5} rows={5} /></div> : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="py-3 pr-4 font-medium w-1/4">Tiêu đề</th>
                <th className="py-3 pr-4 font-medium w-1/3">Nội dung</th>
                <th className="py-3 pr-4 font-medium">Phân loại</th>
                <th className="py-3 pr-4 font-medium">Gửi đến</th>
                <th className="py-3 font-medium whitespace-nowrap text-right">Ngày gửi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-text-secondary">Không tìm thấy thông báo nào</td></tr>
              )}
              {paginatedItems.map(n => (
                <tr key={n._id} onClick={() => setViewingNotification(n)} className="border-b border-border last:border-0 hover:bg-bg-page/50 cursor-pointer transition-colors">
                  <td className="py-3 pr-4 align-top font-medium text-text-primary">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className={`shrink-0 ${n.scope === 'GENERAL' ? 'text-primary' : 'text-status-warning-text'}`} />
                      <span className="line-clamp-1">{n.title}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 align-top text-text-secondary">
                    <div className="line-clamp-1">{n.content}</div>
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <Badge value={n.scope} />
                  </td>
                  <td className="py-3 pr-4 align-top">
                    {n.scope === 'GENERAL' ? (
                      <span className="font-semibold text-primary">Tất cả sinh viên</span>
                    ) : (
                      <div className="flex flex-col gap-1 items-start text-text-primary">
                        {n.students && n.students.length > 0 ? (
                          <span className="flex min-w-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingStudent(n.students![0]);
                              }}
                              className="max-w-[180px] truncate text-left font-medium text-primary hover:underline"
                              title={`${n.students[0].studentCode} - ${n.students[0].fullName}`}
                            >
                              {n.students[0].fullName || n.students[0].studentCode}
                            </button>
                            {n.students.length > 1 && <span className="text-text-secondary font-medium"> (+{n.students.length - 1})</span>}
                          </span>
                        ) : (
                          <span className="text-text-muted italic text-xs">Trống</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 align-top text-text-secondary whitespace-nowrap text-right">
                    {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2 border-t border-border pt-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-border text-text-secondary hover:bg-bg-page disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-text-secondary px-2">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md border border-border text-text-secondary hover:bg-bg-page disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tạo thông báo">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select label="Phạm vi" options={[{ value: 'GENERAL', label: 'Chung (tất cả sinh viên)' }, { value: 'PRIVATE', label: 'Riêng (chọn sinh viên)' }]} value={scope} onChange={e => { setScope(e.target.value as 'GENERAL' | 'PRIVATE'); setSelectedStudents([]); }} />
          <Input label="Tiêu đề" name="title" required />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Nội dung</label>
            <textarea name="content" required rows={4} className="w-full rounded-[var(--radius-sm)] border border-border bg-bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary" />
          </div>
          {scope === 'PRIVATE' && (
            <MultiSearchableSelect
              label="Chọn sinh viên"
              options={studentOptions}
              value={selectedStudents}
              onChange={setSelectedStudents}
              placeholder="Tìm mã SV hoặc tên..."
              loading={studentsLoading}
              onSearch={setStudentKeyword}
            />
          )}
          <Button type="submit" loading={createGeneral.isPending || createPrivate.isPending} className="mt-2">Gửi thông báo</Button>
        </form>
      </Modal>

      <Modal
        open={!!viewingNotification}
        onClose={() => setViewingNotification(null)}
        title="Chi tiết người nhận thông báo"
      >
        <div className="flex flex-col gap-4 max-h-[65vh]">
          <div className="flex flex-col gap-1 bg-bg-page/40 p-3 rounded-[var(--radius-sm)] border border-border">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{viewingNotification?.scope === 'GENERAL' ? 'Thông báo chung' : 'Thông báo riêng'}</span>
            <h4 className="font-semibold text-text-primary text-sm">{viewingNotification?.title}</h4>
            <p className="text-xs text-text-secondary whitespace-pre-wrap mt-1 leading-relaxed max-h-[15vh] overflow-y-auto">{viewingNotification?.content}</p>
          </div>

          {viewingNotification?.scope === 'PRIVATE' && (
            <div className="flex flex-col gap-2 flex-1 overflow-hidden">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                Danh sách sinh viên nhận ({viewingNotification?.students?.length || 0})
              </span>
              <div className="border border-border rounded-[var(--radius-sm)] overflow-y-auto max-h-[30vh] bg-bg-card">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-bg-page border-b border-border font-semibold text-text-secondary sticky top-0 uppercase">
                      <th className="px-3 py-2">Mã Sinh Viên</th>
                      <th className="px-3 py-2">Họ Và Tên</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {viewingNotification?.students?.map((sv) => (
                      <tr key={sv._id} className="hover:bg-bg-page/10 transition-colors">
                        <td className="px-3 py-2 font-mono font-medium text-text-primary">{sv.studentCode}</td>
                        <td className="px-3 py-2 text-text-secondary">
                          <button
                            type="button"
                            onClick={() => setViewingStudent(sv)}
                            className="max-w-[220px] truncate text-left font-medium text-primary hover:underline"
                            title={sv.fullName}
                          >
                            {sv.fullName}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!viewingNotification?.students || viewingNotification.students.length === 0) && (
                      <tr>
                        <td colSpan={2} className="px-3 py-4 text-center text-text-secondary italic">
                          Không tìm thấy thông tin sinh viên nhận.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4 mt-2">
            <Button variant="secondary" onClick={() => setViewingNotification(null)}>Đóng</Button>
          </div>
        </div>
      </Modal>

      {viewingStudent && (
        <StudentDetailModal student={viewingStudent} onClose={() => setViewingStudent(null)} />
      )}
    </div>
  );
}
