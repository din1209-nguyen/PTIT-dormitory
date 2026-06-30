import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useUpdateSemester } from '../api';
import type { Semester } from '@/types/semester';

import { Play, RotateCcw } from 'lucide-react';

interface EditSemesterModalProps {
  open: boolean;
  onClose: () => void;
  semester: Semester | null;
  onActivate?: () => void;
  onRevert?: () => void;
}

export function EditSemesterModal({ open, onClose, semester, onActivate, onRevert }: EditSemesterModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const updateMut = useUpdateSemester();

  useEffect(() => {
    if (semester) {
      setStartDate(new Date(semester.startDate).toISOString().split('T')[0]);
      setEndDate(new Date(semester.endDate).toISOString().split('T')[0]);
    }
  }, [semester]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semester) return;
    
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    try {
      await updateMut.mutateAsync({
        id: semester._id,
        data: { startDate, endDate }
      });
      toast.success('Cập nhật thời gian kỳ lưu trú thành công');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Cập nhật thất bại');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Chỉnh sửa thời gian: ${semester?.name || ''}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ngày bắt đầu"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            required
            disabled={semester?.status !== 'UNOPENED'}
          />
          <Input
            label="Ngày kết thúc"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            required
            disabled={semester?.status !== 'UNOPENED'}
          />
        </div>
        
        <div className="mt-2 text-sm text-text-secondary bg-background-light p-3 rounded border border-border">
          <p><strong>Lưu ý:</strong></p>
          <ul className="list-disc pl-4 mt-1">
            <li>Khoảng thời gian này không được trùng lặp với các kỳ học khác.</li>
            <li>Sau khi cập nhật, hệ thống sẽ tự động chuyển trạng thái "Chuẩn bị" khi đủ điều kiện.</li>
          </ul>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={updateMut.isPending}>
            Đóng
          </Button>

          {semester?.status === 'UNOPENED' && (
            <Button type="submit" loading={updateMut.isPending}>
              Lưu thay đổi
            </Button>
          )}

          {semester?.status === 'PREPARING' && onActivate && (
            <Button type="button" onClick={onActivate} className="bg-status-active-bg text-status-active-text hover:opacity-80 border-none">
              <Play size={16} className="mr-2" /> Kích hoạt
            </Button>
          )}

          {semester?.status === 'ACTIVE' && onRevert && (
            <Button type="button" onClick={onRevert} className="bg-status-warning-bg text-status-warning-text hover:opacity-80 border-none">
              <RotateCcw size={16} className="mr-2" /> Hoàn tác
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
