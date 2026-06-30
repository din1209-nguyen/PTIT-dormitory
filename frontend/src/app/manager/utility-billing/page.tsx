'use client';

import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Banknote, Download, Droplets, Plus, XCircle, Zap, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useBulkUpdateElectricPriceTiers,
  useCancelBill,
  useCreateUtilityUsage,
  useElectricPriceTiers,
  useGenerateBills,
  useMarkOverdue,
  useUtilityBill,
  useUtilityBills,
  useUtilityUsages,
} from '@/features/utilityBilling/api';
import { useBillPayments, useCashConfirm } from '@/features/payments/api';
import { useSemesters } from '@/features/semesters/api';
import { useAllRooms } from '@/features/dormitories/api';
import { useHistoryBySemester } from '@/features/roomAssignments/api';
import apiClient from '@/lib/api/apiClient';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { TableSkeleton } from '@/components/common/Skeleton';
import type { UtilityBill, UtilityBillMember } from '@/types/utilityBilling';

import jsPDF from 'jspdf';

const TABS = ['Ghi chỉ số', 'Hóa đơn', 'Cấu hình điện nước'] as const;

function formatMoney(n: number) {
  return n.toLocaleString('vi-VN') + ' đ';
}

import { getRoomLabel, docTien, generatePDF } from '@/features/utilityBilling/utils';

export default function UtilityBillingPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);

  return (
    <div className="flex flex-col gap-6">
      {tab === 'Ghi chỉ số' && <UsageTab activeTab={tab} onTabChange={setTab} />}
      {tab === 'Hóa đơn' && <BillTab activeTab={tab} onTabChange={setTab} />}
      {tab === 'Cấu hình điện nước' && <ConfigTab activeTab={tab} onTabChange={setTab} />}
    </div>
  );
}

function UtilityTabs({ activeTab, onTabChange }: { activeTab: string; onTabChange: (t: any) => void }) {
  return (
    <div className="flex shrink-0 rounded-[var(--radius-md)] bg-bg-page p-1">
      {TABS.map(t => (
        <button
          key={t}
          onClick={() => onTabChange(t)}
          className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === t ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function UsageTab({ activeTab, onTabChange }: { activeTab: string; onTabChange: (t: any) => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [semesterId, setSemesterId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [oldElec, setOldElec] = useState<number | string>(0);
  const [oldWater, setOldWater] = useState<number | string>(0);
  const [newElec, setNewElec] = useState<number | string>('');
  const [newWater, setNewWater] = useState<number | string>('');

  const { data, isLoading } = useUtilityUsages({ month, year, limit: 100 });
  const { data: semesters } = useSemesters({ limit: 50 });
  const { data: allRooms } = useAllRooms();
  const { data: history } = useUtilityUsages({ roomId: selectedRoom || undefined, limit: 1, sortBy: 'recordedAt', sortOrder: 'desc' });
  const createMut = useCreateUtilityUsage();
  const generateMut = useGenerateBills();

  const activeSemester = semesters?.items.find(s => s.status === 'ACTIVE') || semesters?.items[0];
  useEffect(() => {
    if (!semesterId && activeSemester) setSemesterId(activeSemester._id);
  }, [activeSemester, semesterId]);
  
  const selectedSemester = semesters?.items.find(s => s._id === semesterId);
  const validMonths = useMemo(() => {
    if (!selectedSemester) return [];
    const start = new Date(selectedSemester.startDate);
    const end = new Date(selectedSemester.endDate);
    const months = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (current <= last) {
      months.push({ month: current.getMonth() + 1, year: current.getFullYear() });
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }, [selectedSemester]);

  useEffect(() => {
    if (validMonths.length > 0) {
      const isValid = validMonths.some(m => m.month === month && m.year === year);
      if (!isValid) {
        setMonth(validMonths[0].month);
        setYear(validMonths[0].year);
      }
    }
  }, [validMonths, month, year]);

  const { data: assignments } = useHistoryBySemester(semesterId);

  const usedRooms = useMemo(() => {
    const roomSet = new Set<string>();
    
    if (assignments) {
      assignments.forEach((a: any) => {
        const roomId = typeof a.roomId === 'object' ? a.roomId._id : a.roomId;
        if (roomId) roomSet.add(roomId);
      });
    }
    
    if (data?.items) {
      data.items.forEach((u: any) => {
        const roomId = typeof u.roomId === 'object' ? u.roomId._id : u.roomId;
        if (roomId) roomSet.add(roomId);
      });
    }

    const isActiveSemester = selectedSemester?.status === 'ACTIVE';
    if (isActiveSemester && allRooms) {
      allRooms.forEach((r: any) => {
        if ((r.stats?.currentResidentCount || 0) > 0) roomSet.add(r._id);
      });
    }
    
    return (allRooms || []).filter((r: any) => roomSet.has(r._id));
  }, [assignments, data?.items, allRooms, selectedSemester]);

  const recordedByRoomId = new Map((data?.items || []).map((u: any) => {
    const roomId = typeof u.roomId === 'object' ? u.roomId._id : u.roomId;
    return [roomId, u];
  }));

  const paginatedUsedRooms = useMemo(() => {
    return usedRooms.slice((page - 1) * 20, page * 20);
  }, [usedRooms, page]);

  const totalPages = Math.ceil(usedRooms.length / 20);

  useEffect(() => {
    const existingUsage: any = selectedRoom ? recordedByRoomId.get(selectedRoom) : null;
    if (existingUsage) {
      setOldElec(existingUsage.oldElectricity);
      setOldWater(existingUsage.oldWater);
      setNewElec(existingUsage.newElectricity);
      setNewWater(existingUsage.newWater);
    } else if (selectedRoom && history?.items?.length) {
      setOldElec(history.items[0].newElectricity);
      setOldWater(history.items[0].newWater);
      setNewElec('');
      setNewWater('');
    } else if (selectedRoom) {
      setOldElec(0);
      setOldWater(0);
      setNewElec('');
      setNewWater('');
    }
  }, [history, selectedRoom, data?.items]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedRoom) return toast.error('Vui lòng chọn phòng');
    const fd = new FormData(e.currentTarget);
    const selectedMonth = Number(fd.get('month'));
    const selectedYear = Number(fd.get('year'));
    if (selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth() + 1)) {
      return toast.error('Không được ghi chỉ số cho thời gian trong quá khứ');
    }
    try {
      await createMut.mutateAsync({
        roomId: selectedRoom,
        month: selectedMonth,
        year: selectedYear,
        oldElectricity: Number(fd.get('oldElectricity')),
        newElectricity: Number(fd.get('newElectricity')),
        oldWater: Number(fd.get('oldWater')),
        newWater: Number(fd.get('newWater')),
      });
      setModalOpen(false);
      toast.success('Ghi chỉ số thành công');
    } catch (error: any) {
      toast.error(error.message || 'Đã xảy ra lỗi khi ghi chỉ số');
    }
  }

  async function handleGenerateBills() {
    try {
      await generateMut.mutateAsync({ month, year });
      toast.success('Tạo hóa đơn thành công');
      onTabChange('Hóa đơn');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể tạo hóa đơn');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4 flex flex-col flex-wrap items-center gap-4 sm:flex-row">
          <UtilityTabs activeTab={activeTab} onTabChange={onTabChange} />
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-text-secondary">Kỳ học:</span>
            <select
              value={semesterId}
              onChange={e => setSemesterId(e.target.value)}
              className="w-56 rounded-[var(--radius-sm)] border border-border bg-bg-page px-2 py-1.5 text-sm outline-none focus:border-primary"
            >
              {semesters?.items.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-text-secondary">Tháng:</span>
            <select
              value={`${month}-${year}`}
              onChange={e => {
                const [m, y] = e.target.value.split('-');
                setMonth(Number(m));
                setYear(Number(y));
              }}
              className="w-32 rounded-[var(--radius-sm)] border border-border bg-bg-page px-2 py-1.5 text-sm outline-none focus:border-primary"
            >
              {validMonths.map(m => (
                <option key={`${m.month}-${m.year}`} value={`${m.month}-${m.year}`}>
                  Tháng {m.month}/{m.year}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-border bg-bg-page px-3 py-1.5 text-sm">
            Đã ghi: <strong className="text-primary">{data?.items.length || 0}</strong>/{usedRooms.length} phòng
          </div>
          <Button onClick={handleGenerateBills} loading={generateMut.isPending} className="ml-auto shrink-0 gap-2">
            <Zap size={16} /> Tạo hóa đơn
          </Button>
        </div>

        {isLoading ? (
          <div className="p-4"><TableSkeleton columns={9} rows={5} /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="py-3 pr-4 font-medium">Phòng</th>
                <th className="py-3 pr-4 font-medium">Trạng thái</th>
                <th className="py-3 pr-4 font-medium"><Zap size={14} className="inline" /> Điện cũ</th>
                <th className="py-3 pr-4 font-medium"><Zap size={14} className="inline" /> Điện mới</th>
                <th className="py-3 pr-4 font-medium">kWh</th>
                <th className="py-3 pr-4 font-medium"><Droplets size={14} className="inline" /> Nước cũ</th>
                <th className="py-3 pr-4 font-medium"><Droplets size={14} className="inline" /> Nước mới</th>
                <th className="py-3 pr-4 font-medium">m³</th>
                <th className="py-3 font-medium">Ngày ghi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsedRooms.map((room: any) => {
                const usage: any = recordedByRoomId.get(room._id);
                return (
                  <tr
                    key={room._id}
                    onClick={() => {
                      setSelectedRoom(room._id);
                      setModalOpen(true);
                    }}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-bg-page/50"
                  >
                    <td className="py-3 pr-4 font-medium">{getRoomLabel(room)}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium ${usage ? 'bg-status-completed-bg text-status-completed-text' : 'bg-red-50 text-red-600'}`}>
                        {usage ? 'Đã ghi' : 'Chưa ghi'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{usage?.oldElectricity ?? '—'}</td>
                    <td className="py-3 pr-4">{usage?.newElectricity ?? '—'}</td>
                    <td className="py-3 pr-4 font-medium text-amber-600">{usage ? usage.newElectricity - usage.oldElectricity : '—'}</td>
                    <td className="py-3 pr-4">{usage?.oldWater ?? '—'}</td>
                    <td className="py-3 pr-4">{usage?.newWater ?? '—'}</td>
                    <td className="py-3 pr-4 font-medium text-blue-600">{usage ? usage.newWater - usage.oldWater : '—'}</td>
                    <td className="py-3 text-text-secondary">{usage ? new Date(usage.recordedAt).toLocaleDateString('vi-VN') : '—'}</td>
                  </tr>
                );
              })}
              {usedRooms.length === 0 && (
                <tr><td colSpan={9} className="py-8 text-center text-text-secondary">Chưa có phòng nào đang được sử dụng</td></tr>
              )}
            </tbody>
          </table>
        )}
        
        {totalPages > 1 && (
          <div className="border-t border-border bg-bg-secondary p-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ghi chỉ số điện nước">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SearchableSelect
            label="Phòng"
            options={usedRooms.map((r: any) => ({
              value: r._id,
              label: getRoomLabel(r),
              sublabel: recordedByRoomId.has(r._id) ? 'Đã ghi tháng này' : 'Chưa ghi tháng này',
            }))}
            value={selectedRoom}
            onChange={setSelectedRoom}
            placeholder="Tìm theo tên phòng..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Tháng" name="month" type="number" value={month} readOnly className="cursor-not-allowed bg-bg-page text-text-secondary" />
            <Input label="Năm" name="year" type="number" value={year} readOnly className="cursor-not-allowed bg-bg-page text-text-secondary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Điện cũ (kWh)" name="oldElectricity" type="number" step="1" min="0" value={oldElec} onChange={e => setOldElec(e.target.value)} onKeyDown={e => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()} required />
            <Input label="Điện mới (kWh)" name="newElectricity" type="number" step="1" min="0" value={newElec} onChange={e => setNewElec(e.target.value)} onKeyDown={e => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nước cũ (m³)" name="oldWater" type="number" step="1" min="0" value={oldWater} onChange={e => setOldWater(e.target.value)} onKeyDown={e => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()} required />
            <Input label="Nước mới (m³)" name="newWater" type="number" step="1" min="0" value={newWater} onChange={e => setNewWater(e.target.value)} onKeyDown={e => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()} required />
          </div>
          <Button type="submit" disabled={createMut.isPending} className="mt-2">Lưu chỉ số</Button>
        </form>
      </Modal>
    </div>
  );
}

function BillTab({ activeTab, onTabChange }: { activeTab: string; onTabChange: (t: any) => void }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [semesterId, setSemesterId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data: semesters } = useSemesters({ limit: 50 });
  const { data, isLoading } = useUtilityBills({ page, limit: 10, month, year, status: status || undefined });
  const markOverdueMut = useMarkOverdue();
  const cancelMut = useCancelBill();

  const activeSemester = semesters?.items.find(s => s.status === 'ACTIVE') || semesters?.items[0];
  useEffect(() => {
    if (!semesterId && activeSemester) setSemesterId(activeSemester._id);
  }, [activeSemester, semesterId]);
  
  const selectedSemester = semesters?.items.find(s => s._id === semesterId);
  const validMonths = useMemo(() => {
    if (!selectedSemester) return [];
    const start = new Date(selectedSemester.startDate);
    const end = new Date(selectedSemester.endDate);
    const months = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (current <= last) {
      months.push({ month: current.getMonth() + 1, year: current.getFullYear() });
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }, [selectedSemester]);

  useEffect(() => {
    if (validMonths.length > 0) {
      const isValid = validMonths.some(m => m.month === month && m.year === year);
      if (!isValid) {
        setMonth(validMonths[0].month);
        setYear(validMonths[0].year);
      }
    }
  }, [validMonths, month, year]);

  return (
    <>
      <Card>
        <div className="mb-4 flex flex-col flex-wrap items-center gap-4 sm:flex-row">
          <UtilityTabs activeTab={activeTab} onTabChange={onTabChange} />
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-text-secondary">Kỳ học:</span>
            <select
              value={semesterId}
              onChange={e => { setSemesterId(e.target.value); setPage(1); }}
              className="w-56 rounded-[var(--radius-sm)] border border-border bg-bg-page px-2 py-1.5 text-sm outline-none focus:border-primary"
            >
              {semesters?.items.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-text-secondary">Tháng:</span>
            <select
              value={`${month}-${year}`}
              onChange={e => {
                const [m, y] = e.target.value.split('-');
                setMonth(Number(m));
                setYear(Number(y));
                setPage(1);
              }}
              className="w-32 rounded-[var(--radius-sm)] border border-border bg-bg-page px-2 py-1.5 text-sm outline-none focus:border-primary"
            >
              {validMonths.map(m => (
                <option key={`${m.month}-${m.year}`} value={`${m.month}-${m.year}`}>
                  Tháng {m.month}/{m.year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm font-medium text-text-secondary">Trạng thái:</span>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-36 rounded-[var(--radius-sm)] border border-border bg-bg-page px-2 py-1.5 text-sm outline-none focus:border-primary">
              <option value="">Tất cả</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="OVERDUE">Quá hạn</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
        </div>

        {isLoading ? <div className="p-4"><TableSkeleton columns={10} rows={5} /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-text-secondary">
              <th className="py-3 pr-4 font-medium">Phòng</th>
              <th className="py-3 pr-4 font-medium">Tháng</th>
              <th className="py-3 pr-4 font-medium">kWh</th>
              <th className="py-3 pr-4 font-medium">m³</th>
              <th className="py-3 pr-4 font-medium">Tiền điện</th>
              <th className="py-3 pr-4 font-medium">Tiền nước</th>
              <th className="py-3 pr-4 font-medium">Tổng</th>
              <th className="py-3 pr-4 font-medium">Hạn TT</th>
              <th className="py-3 pr-4 font-medium">Trạng thái</th>
              <th className="py-3 pr-4 font-medium text-center">Tải</th>
              <th className="py-3 font-medium"></th>
            </tr></thead>
            <tbody>
              {data?.items.map(b => (
                <tr key={b._id} onClick={() => setDetailId(b._id)} className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-bg-page/50">
                  <td className="py-3 pr-4 font-medium">{getRoomLabel(b.roomId)}</td>
                  <td className="py-3 pr-4">{b.month}/{b.year}</td>
                  <td className="py-3 pr-4">{b.electricityUsage}</td>
                  <td className="py-3 pr-4">{b.waterUsage}</td>
                  <td className="py-3 pr-4">{formatMoney(b.electricityCost)}</td>
                  <td className="py-3 pr-4">{formatMoney(b.waterCost)}</td>
                  <td className="py-3 pr-4 font-bold">{formatMoney(b.totalCost)}</td>
                  <td className="py-3 pr-4 text-text-secondary">{new Date(b.dueDate).toLocaleDateString('vi-VN')}</td>
                  <td className="py-3 pr-4"><Badge value={b.status} /></td>
                  <td className="py-3 pr-4 text-center">
                    <button onClick={(e) => { e.stopPropagation(); generatePDF(b); }} className="text-text-secondary hover:text-blue-600 p-1" title="Tải hóa đơn">
                      <Download size={16} />
                    </button>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {b.status === 'UNPAID' && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); markOverdueMut.mutate(b._id); }} className="text-text-secondary hover:text-amber-500" title="Quá hạn"><AlertTriangle size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); cancelMut.mutate(b._id); }} className="text-text-secondary hover:text-red-500" title="Hủy"><XCircle size={16} /></button>
                        </>
                      )}
                      {b.status === 'OVERDUE' && (
                        <button onClick={(e) => { e.stopPropagation(); cancelMut.mutate(b._id); }} className="text-text-secondary hover:text-red-500" title="Hủy"><XCircle size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={10} className="py-8 text-center text-text-secondary">Không có hóa đơn</td></tr>}
            </tbody>
          </table>
        )}
        {data && data.pagination.totalPages > 1 && (
          <Pagination currentPage={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        )}
      </Card>

      {detailId && <BillDetailModal billId={detailId} onClose={() => setDetailId(null)} />}
    </>
  );
}

function BillDetailModal({ billId, onClose }: { billId: string; onClose: () => void }) {
  const { data: bill, isLoading } = useUtilityBill(billId);
  const { data: payments } = useBillPayments(billId);
  const cashConfirmMut = useCashConfirm();

  if (isLoading || !bill) return <Modal open onClose={onClose} title="Chi tiết hóa đơn"><div className="flex justify-center py-4 text-text-secondary"><Loader2 className="w-6 h-6 animate-spin" /></div></Modal>;

  return (
    <Modal open onClose={onClose} title={`Hóa đơn tháng ${bill.month}/${bill.year} — ${getRoomLabel(bill.roomId)}`}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-sm rounded-[var(--radius-md)] border border-border bg-bg-page p-4">
          <div><span className="text-text-secondary">Điện tiêu thụ:</span> <strong className="text-amber-600">{bill.electricityUsage} kWh</strong></div>
          <div><span className="text-text-secondary">Tiền điện:</span> <strong>{formatMoney(bill.electricityCost)}</strong></div>
          <div><span className="text-text-secondary">Nước tiêu thụ:</span> <strong className="text-blue-600">{bill.waterUsage} m³</strong></div>
          <div><span className="text-text-secondary">Tiền nước:</span> <strong>{formatMoney(bill.waterCost)}</strong></div>
          <div><span className="text-text-secondary">VAT điện:</span> <strong>{formatMoney(bill.priceConfigSnapshot?.electricVatAmount || bill.vatAmount)}</strong></div>
          <div><span className="text-text-secondary">Tổng cộng:</span> <strong className="text-primary text-lg">{formatMoney(bill.totalCost)}</strong></div>
          <div className="mt-2"><span className="text-text-secondary">Trạng thái:</span> <Badge value={bill.status} /></div>
          <div className="mt-2"><span className="text-text-secondary">Hạn TT:</span> {new Date(bill.dueDate).toLocaleDateString('vi-VN')}</div>
        </div>

        <h3 className="text-sm font-semibold">Thành viên phòng</h3>
        <div className="flex flex-col gap-2">
          {bill.members?.map((m: UtilityBillMember) => {
            const s = typeof m.studentId === 'object' ? m.studentId : null;
            return (
              <div key={m._id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm shadow-sm">
                <div><span className="font-medium">{s?.studentCode}</span> <span className="text-text-secondary">{s?.fullName}</span></div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary">{formatMoney(m.amountShare)}</span>
                  <Badge value={m.status} />
                  {m.status === 'UNPAID' && bill.status !== 'CANCELLED' && (
                    <button
                      onClick={() => cashConfirmMut.mutate({ billId, studentId: s?._id || '' })}
                      disabled={cashConfirmMut.isPending}
                      className="flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                    >
                      <Banknote size={14} /> TM
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {payments && payments.length > 0 && (
          <>
            <h3 className="text-sm font-semibold">Lịch sử thanh toán</h3>
            <div className="flex flex-col gap-2">
              {payments.map(p => {
                const s = typeof p.studentId === 'object' ? p.studentId : null;
                return (
                  <div key={p._id} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm shadow-sm">
                    <div>
                      <span className="font-medium">{s?.studentCode}</span>
                      <span className="text-text-secondary"> — {p.method}</span>
                      {p.vnpTxnRef && <span className="text-xs text-text-secondary"> ({p.vnpTxnRef})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary">{formatMoney(p.amount)}</span>
                      <Badge value={p.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function ConfigTab({ activeTab, onTabChange }: { activeTab: string; onTabChange: (t: any) => void }) {
  const qc = useQueryClient();
  const { data: priceVal, isLoading: lp } = useQuery({
    queryKey: ['config', 'water_unit_price'],
    queryFn: () => apiClient.get('/configs/water_unit_price').then(r => r.data.data.configValue),
  });
  const { data: quotaVal, isLoading: lq } = useQuery({
    queryKey: ['config', 'free_water_quota'],
    queryFn: () => apiClient.get('/configs/free_water_quota').then(r => r.data.data.configValue),
  });
  const { data: vatVal, isLoading: lv } = useQuery({
    queryKey: ['config', 'electric_vat_rate'],
    queryFn: () => apiClient.get('/configs/electric_vat_rate').then(r => r.data.data.configValue),
  });
  const { data: waterVatVal, isLoading: lwv } = useQuery({
    queryKey: ['config', 'water_vat_rate'],
    queryFn: () => apiClient.get('/configs/water_vat_rate').then(r => r.data.data.configValue),
  });
  const { data: wastewaterVal, isLoading: lwvv } = useQuery({
    queryKey: ['config', 'wastewater_fee_rate'],
    queryFn: () => apiClient.get('/configs/wastewater_fee_rate').then(r => r.data.data.configValue),
  });

  const updateMut = useMutation({
    mutationFn: (data: { key: string; value: string }) => apiClient.put(`/configs/${data.key}`, { value: data.value }),
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['config', v.key] }),
  });

  const { data: tiers, isLoading: lTiers } = useElectricPriceTiers();
  const bulkMut = useBulkUpdateElectricPriceTiers();

  const [isEditingWater, setIsEditingWater] = useState(false);
  const [isEditingTax, setIsEditingTax] = useState(false);
  const [price, setPrice] = useState('');
  const [quota, setQuota] = useState('');
  const [vatPercent, setVatPercent] = useState('');
  const [waterVatPercent, setWaterVatPercent] = useState('');
  const [wastewaterPercent, setWastewaterPercent] = useState('');

  const [isEditingTiers, setIsEditingTiers] = useState(false);
  const [localTiers, setLocalTiers] = useState<{ id: string; toKwh: number | null; unitPrice: number }[]>([]);

  useEffect(() => {
    if (!isEditingWater) {
      if (priceVal !== undefined) setPrice(priceVal);
      if (quotaVal !== undefined) setQuota(quotaVal);
    }
  }, [priceVal, quotaVal, isEditingWater]);

  useEffect(() => {
    if (!isEditingTax) {
      if (vatVal !== undefined) setVatPercent(String(Number(vatVal) * 100));
      if (waterVatVal !== undefined) setWaterVatPercent(String(Number(waterVatVal) * 100));
      if (wastewaterVal !== undefined) setWastewaterPercent(String(Number(wastewaterVal) * 100));
    }
  }, [vatVal, waterVatVal, wastewaterVal, isEditingTax]);

  useEffect(() => {
    if (tiers && !isEditingTiers) {
      setLocalTiers(tiers.map(t => ({ id: Math.random().toString(), toKwh: t.toKwh, unitPrice: t.unitPrice })));
    }
  }, [tiers, isEditingTiers]);

  async function handleSaveWater() {
    try {
      await updateMut.mutateAsync({ key: 'water_unit_price', value: price });
      await updateMut.mutateAsync({ key: 'free_water_quota', value: quota });
      toast.success('Cập nhật cấu hình nước thành công');
      setIsEditingWater(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lỗi lưu cấu hình nước');
    }
  }

  async function handleSaveTax() {
    try {
      await updateMut.mutateAsync({ key: 'electric_vat_rate', value: String(Number(vatPercent) / 100) });
      await updateMut.mutateAsync({ key: 'water_vat_rate', value: String(Number(waterVatPercent) / 100) });
      await updateMut.mutateAsync({ key: 'wastewater_fee_rate', value: String(Number(wastewaterPercent) / 100) });
      toast.success('Cập nhật cấu hình thuế & phí thành công');
      setIsEditingTax(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lỗi lưu cấu hình thuế & phí');
    }
  }

  function handleCancelTiers() {
    if (tiers) setLocalTiers(tiers.map(t => ({ id: Math.random().toString(), toKwh: t.toKwh, unitPrice: t.unitPrice })));
    setIsEditingTiers(false);
  }

  function handleTierChange(index: number, field: 'toKwh' | 'unitPrice', value: string) {
    const next = [...localTiers];
    next[index] = { ...next[index], [field]: value === '' ? null : Number(value) };
    setLocalTiers(next);
  }

  async function handleSaveTiers() {
    for (let i = 1; i < localTiers.length; i++) {
      if (localTiers[i].unitPrice <= localTiers[i - 1].unitPrice) return toast.error(`Đơn giá Bậc ${i + 1} phải lớn hơn Bậc ${i}`);
    }
    try {
      await bulkMut.mutateAsync(localTiers.map(t => ({ toKwh: t.toKwh, unitPrice: t.unitPrice })));
      toast.success('Lưu cấu hình bậc giá điện thành công');
      setIsEditingTiers(false);
    } catch (err) {
      toast.error((err as Error).message || 'Lưu cấu hình thất bại');
    }
  }



  return (
    <Card>
      <div className="mb-8 flex flex-col flex-wrap items-center gap-4 sm:flex-row">
        <UtilityTabs activeTab={activeTab} onTabChange={onTabChange} />
      </div>

      <div className="flex flex-col gap-8">
        {/* Phần Điện */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2"><Zap size={20} /> Bậc điện</h3>
              <p className="mt-1 text-sm text-text-secondary">Áp dụng cho tính tiền điện bậc thang EVN.</p>
            </div>
            <div className="flex gap-3">
              {isEditingTiers ? (
                <>
                  <Button onClick={handleCancelTiers} variant="outline" type="button">Hủy bỏ</Button>
                  <Button onClick={() => setLocalTiers([...localTiers, { id: Math.random().toString(), toKwh: null, unitPrice: 0 }])} variant="secondary" type="button"><Plus size={16} /> Thêm bậc</Button>
                  <Button onClick={handleSaveTiers} loading={bulkMut.isPending} type="button">Lưu bậc giá</Button>
                </>
              ) : (
                <Button onClick={() => setIsEditingTiers(true)} type="button">Chỉnh sửa bậc giá</Button>
              )}
            </div>
          </div>
          {lTiers ? <div className="p-4"><TableSkeleton columns={5} rows={5} /></div> : (
            <div className="rounded-[var(--radius-md)] border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg-page"><tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-3 px-4 font-medium">Bậc</th>
                  <th className="py-3 px-4 font-medium">Từ (kWh)</th>
                  <th className="py-3 px-4 font-medium">Đến (kWh)</th>
                  <th className="py-3 px-4 font-medium">Đơn giá (đ/kWh)</th>
                  <th className="w-10 py-3 font-medium"></th>
                </tr></thead>
                <tbody>
                  {localTiers.map((t, i) => {
                    const fromKwh = i === 0 ? 0 : (localTiers[i - 1].toKwh ?? 0);
                    return (
                      <tr key={t.id} className="border-b border-border last:border-0 bg-white">
                        <td className="py-3 px-4 font-medium">Bậc {i + 1}</td>
                        <td className="py-3 px-4 text-text-secondary">{fromKwh}</td>
                        <td className="py-3 px-4">
                          {isEditingTiers ? (
                            <input type="number" value={t.toKwh ?? ''} onChange={(e) => handleTierChange(i, 'toKwh', e.target.value)} placeholder="Vô cực" className="w-24 rounded-[var(--radius-sm)] border border-border bg-bg-page px-2 py-1 outline-none focus:border-primary" />
                          ) : (
                            t.toKwh ?? '∞'
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-amber-600">
                          {isEditingTiers ? (
                            <input type="number" value={t.unitPrice || ''} onChange={(e) => handleTierChange(i, 'unitPrice', e.target.value)} className="w-28 rounded-[var(--radius-sm)] border border-border bg-bg-page px-2 py-1 outline-none focus:border-primary" />
                          ) : (
                            t.unitPrice.toLocaleString('vi-VN')
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditingTiers && (
                            <button onClick={() => setLocalTiers(localTiers.filter((_, idx) => idx !== i))} className="text-text-secondary hover:text-accent-red" title="Xóa bậc">
                              <XCircle size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="h-px w-full bg-border" />

        {/* Phần Nước */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-cyan-600 flex items-center gap-2"><Droplets size={20} /> Nước</h3>
              <p className="mt-1 text-sm text-text-secondary">Cấu hình đơn giá nước sinh hoạt và định mức miễn phí.</p>
            </div>
            <div className="flex gap-3">
              {isEditingWater ? (
                <>
                  <Button onClick={() => setIsEditingWater(false)} variant="outline" type="button">Hủy bỏ</Button>
                  <Button onClick={handleSaveWater} loading={updateMut.isPending} type="button">Lưu cấu hình</Button>
                </>
              ) : (
                <Button onClick={() => setIsEditingWater(true)} type="button">Chỉnh sửa</Button>
              )}
            </div>
          </div>
          {(lp || lq) ? <div className="p-4"><TableSkeleton columns={2} rows={2} /></div> : (
            <div className="grid gap-6 rounded-[var(--radius-md)] border border-border bg-bg-page p-5 md:grid-cols-2">
              <div className="flex flex-col gap-1 rounded border border-border bg-white p-4 shadow-sm">
                <span className="text-sm font-semibold text-cyan-600">Đơn giá nước sinh hoạt</span>
                {isEditingWater ? <Input type="number" value={price} onChange={e => setPrice(e.target.value)} /> : <div className="mt-1 text-xl font-medium">{formatMoney(Number(price))} <span className="text-sm font-normal text-text-secondary">/ m³</span></div>}
              </div>
              <div className="flex flex-col gap-1 rounded border border-border bg-white p-4 shadow-sm">
                <span className="text-sm font-semibold text-cyan-600">Định mức miễn phí</span>
                {isEditingWater ? <Input type="number" value={quota} onChange={e => setQuota(e.target.value)} /> : <div className="mt-1 text-xl font-medium">{quota} <span className="text-sm font-normal text-text-secondary">m³ / phòng</span></div>}
              </div>
            </div>
          )}
        </div>

        <div className="h-px w-full bg-border" />

        {/* Phần Thuế và Phí */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-emerald-600 flex items-center gap-2"><Banknote size={20} /> Thuế và Phí</h3>
              <p className="mt-1 text-sm text-text-secondary">Cấu hình các loại thuế GTGT và phí bảo vệ môi trường.</p>
            </div>
            <div className="flex gap-3">
              {isEditingTax ? (
                <>
                  <Button onClick={() => setIsEditingTax(false)} variant="outline" type="button">Hủy bỏ</Button>
                  <Button onClick={handleSaveTax} loading={updateMut.isPending} type="button">Lưu cấu hình</Button>
                </>
              ) : (
                <Button onClick={() => setIsEditingTax(true)} type="button">Chỉnh sửa</Button>
              )}
            </div>
          </div>
          {(lv || lwv || lwvv) ? <div className="p-4"><TableSkeleton columns={3} rows={2} /></div> : (
            <div className="grid gap-6 rounded-[var(--radius-md)] border border-border bg-bg-page p-5 md:grid-cols-3">
              <div className="flex flex-col gap-1 rounded border border-border bg-white p-4 shadow-sm">
                <span className="text-sm font-semibold text-emerald-600">VAT Điện (%)</span>
                {isEditingTax ? <Input type="number" min="0" step="0.1" value={vatPercent} onChange={e => setVatPercent(e.target.value)} /> : <div className="mt-1 text-xl font-medium">{vatPercent || 0}%</div>}
              </div>
              <div className="flex flex-col gap-1 rounded border border-border bg-white p-4 shadow-sm">
                <span className="text-sm font-semibold text-emerald-600">VAT Nước (%)</span>
                {isEditingTax ? <Input type="number" min="0" step="0.1" value={waterVatPercent} onChange={e => setWaterVatPercent(e.target.value)} /> : <div className="mt-1 text-xl font-medium">{waterVatPercent || 0}%</div>}
              </div>
              <div className="flex flex-col gap-1 rounded border border-border bg-white p-4 shadow-sm">
                <span className="text-sm font-semibold text-emerald-600">Phí BV Môi trường nước (%)</span>
                {isEditingTax ? <Input type="number" min="0" step="0.1" value={wastewaterPercent} onChange={e => setWastewaterPercent(e.target.value)} /> : <div className="mt-1 text-xl font-medium">{wastewaterPercent || 0}%</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
