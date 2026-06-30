'use client';

import { User } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { useRoomAssignmentsByStudent } from '@/features/roomAssignments/api';
import type { RoomAssignment } from '@/types/roomAssignment';
import type { Student } from '@/types/student';

type StudentDetail = Partial<Student> & Pick<Student, '_id' | 'studentCode' | 'fullName'>;

function formatResidencePosition(record: RoomAssignment) {
  const room = typeof record.roomId === 'string' ? null : record.roomId;
  const bed = typeof record.bedId === 'string' ? null : record.bedId;
  const snapshot = record.roomSnapshot || {};
  return [
    snapshot.buildingName ? `Khu ${snapshot.buildingName}` : '',
    snapshot.floorNumber ? `Tầng ${snapshot.floorNumber}` : '',
    snapshot.roomNumber || room?.roomNumber ? `Phòng ${snapshot.roomNumber || room?.roomNumber}` : '',
    snapshot.bedNumber || bed?.bedNumber ? `Giường ${snapshot.bedNumber || bed?.bedNumber}` : '',
  ].filter(Boolean).join(' - ') || 'Chưa có thông tin chỗ ở';
}

function formatGender(gender?: string) {
  if (gender === 'MALE') return 'Nam';
  if (gender === 'FEMALE') return 'Nữ';
  return '—';
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-bg-card p-3">
      <div className="mb-1 text-xs font-medium text-text-secondary">{label}</div>
      <div className="break-words font-medium text-text-primary">{value}</div>
    </div>
  );
}

export function StudentDetailModal({ student, onClose }: { student: StudentDetail; onClose: () => void }) {
  const { data: assignments, isLoading } = useRoomAssignmentsByStudent(student._id);
  const currentResidence = assignments?.find(a => a.status === 'ACTIVE');

  return (
    <Modal open={true} onClose={onClose} title="Thông tin sinh viên" size="xl">
      <div className="space-y-5">
        <div className="flex items-center gap-4 border-b border-border pb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-page text-lg font-semibold text-text-primary shrink-0">
            <User size={26} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary">{student.fullName}</h3>
            <p className="text-sm text-text-secondary">{student.studentCode}</p>
          </div>
          {currentResidence && currentResidence.semesterId && typeof currentResidence.semesterId !== 'string' && (
            <div className="hidden sm:flex flex-col items-end text-right bg-bg-page px-3 py-2 rounded-[var(--radius-md)] border border-border">
              <div className="flex items-center gap-2">
                <Badge value={currentResidence.semesterId.status} />
                <span className="text-xs font-semibold text-primary">{currentResidence.semesterId.name}</span>
              </div>
              {currentResidence.semesterId.startDate && currentResidence.semesterId.endDate && (
                <span className="text-xs text-text-secondary mt-0.5">
                  {new Date(currentResidence.semesterId.startDate).toLocaleDateString('vi-VN')} - {new Date(currentResidence.semesterId.endDate).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>
          )}
        </div>
        
        {currentResidence && currentResidence.semesterId && typeof currentResidence.semesterId !== 'string' && (
          <div className="sm:hidden flex flex-col items-center text-center bg-bg-page px-3 py-2 rounded-[var(--radius-md)] border border-border -mt-2">
            <div className="flex items-center gap-2">
              <Badge value={currentResidence.semesterId.status} />
              <span className="text-xs font-semibold text-primary">{currentResidence.semesterId.name}</span>
            </div>
            {currentResidence.semesterId.startDate && currentResidence.semesterId.endDate && (
              <span className="text-xs text-text-secondary mt-0.5">
                {new Date(currentResidence.semesterId.startDate).toLocaleDateString('vi-VN')} - {new Date(currentResidence.semesterId.endDate).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>
        )}

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <InfoRow label="Giới tính" value={formatGender(student.gender)} />
          <InfoRow label="Email" value={student.email || '—'} />
          <InfoRow label="Khoa" value={student.department || '—'} />
          <InfoRow label="Ngành" value={student.major || '—'} />
          <InfoRow label="Lớp" value={student.className || '—'} />
          <InfoRow label="Khóa" value={student.academicYear || '—'} />
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-bg-page p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-text-primary">Thông tin lưu trú hiện tại</h4>
            {student.residenceType ? (
              <Badge value={student.residenceType} />
            ) : (
              <span className="text-xs font-medium text-text-secondary">Chưa có dữ liệu</span>
            )}
          </div>
          {isLoading ? (
            <p className="text-sm text-text-secondary">Đang tải thông tin lưu trú...</p>
          ) : currentResidence ? (
            <div className="space-y-1 text-sm">
              <div className="font-medium text-text-primary">{formatResidencePosition(currentResidence)}</div>
              <div className="text-text-secondary">
                Ngày xếp: {new Date(currentResidence.assignedAt).toLocaleDateString('vi-VN')}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              {!student.residenceType
                ? 'Chưa có dữ liệu lưu trú hiện tại.'
                : student.residenceType === 'RESIDING'
                  ? 'Chưa tìm thấy bản ghi chỗ ở hiện tại.'
                  : 'Sinh viên chưa đang lưu trú.'}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
