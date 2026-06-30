'use client';

import { User, Loader2 } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { useRoomAssignmentsByStudent } from '@/features/roomAssignments/api';
import type { RoomAssignment } from '@/types/roomAssignment';
import type { Student } from '@/types/student';

type StudentDetail = Partial<Student> & Pick<Student, '_id' | 'studentCode' | 'fullName'>;

const TEXT = {
  title: 'Th\u00f4ng tin sinh vi\u00ean',
  floor: 'T\u1ea7ng',
  room: 'Ph\u00f2ng',
  bed: 'Gi\u01b0\u1eddng',
  noResidencePosition: 'Ch\u01b0a c\u00f3 th\u00f4ng tin ch\u1ed7 \u1edf',
  female: 'N\u1eef',
  gender: 'Gi\u1edbi t\u00ednh',
  phone: 'S\u1ed1 \u0111i\u1ec7n tho\u1ea1i',
  address: '\u0110\u1ecba ch\u1ec9',
  major: 'Ng\u00e0nh',
  className: 'L\u1edbp',
  academicYear: 'Kh\u00f3a',
  currentResidence: 'Th\u00f4ng tin l\u01b0u tr\u00fa hi\u1ec7n t\u1ea1i',
  noData: 'Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u',
  assignedDate: 'Ng\u00e0y x\u1ebfp',
  noResidenceData: 'Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u l\u01b0u tr\u00fa hi\u1ec7n t\u1ea1i.',
  noCurrentAssignment: 'Ch\u01b0a t\u00ecm th\u1ea5y b\u1ea3n ghi ch\u1ed7 \u1edf hi\u1ec7n t\u1ea1i.',
  notResiding: 'Sinh vi\u00ean ch\u01b0a \u0111ang l\u01b0u tr\u00fa.',
  notUpdated: 'Ch\u01b0a c\u1eadp nh\u1eadt',
};

function formatResidencePosition(record: RoomAssignment) {
  const room = typeof record.roomId === 'string' ? null : record.roomId;
  const bed = typeof record.bedId === 'string' ? null : record.bedId;
  const snapshot = record.roomSnapshot || {};
  return [
    snapshot.buildingName ? `Khu ${snapshot.buildingName}` : '',
    snapshot.floorNumber ? `${TEXT.floor} ${snapshot.floorNumber}` : '',
    snapshot.roomNumber || room?.roomNumber ? `${TEXT.room} ${snapshot.roomNumber || room?.roomNumber}` : '',
    snapshot.bedNumber || bed?.bedNumber ? `${TEXT.bed} ${snapshot.bedNumber || bed?.bedNumber}` : '',
  ].filter(Boolean).join(' - ') || TEXT.noResidencePosition;
}

function formatGender(gender?: string) {
  if (gender === 'MALE') return 'Nam';
  if (gender === 'FEMALE') return TEXT.female;
  return '\u2014';
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
  const currentResidence = assignments?.find(assignment => assignment.status === 'ACTIVE');

  return (
    <Modal open={true} onClose={onClose} title={TEXT.title} size="xl">
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
          <InfoRow label={TEXT.gender} value={formatGender(student.gender)} />
          <InfoRow label="Email" value={student.email || '\u2014'} />
          <InfoRow label={TEXT.phone} value={student.phone || '\u2014'} />
          <InfoRow label={TEXT.address} value={student.address || TEXT.notUpdated} />
          <InfoRow label="Khoa" value={student.department || '\u2014'} />
          <InfoRow label={TEXT.major} value={student.major || '\u2014'} />
          <InfoRow label={TEXT.className} value={student.className || '\u2014'} />
          <InfoRow label={TEXT.academicYear} value={student.academicYear || '\u2014'} />
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-bg-page p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-text-primary">{TEXT.currentResidence}</h4>
            {student.residenceType ? (
              <Badge value={student.residenceType} />
            ) : (
              <span className="text-xs font-medium text-text-secondary">{TEXT.noData}</span>
            )}
          </div>
          {isLoading ? (
            <div className="flex justify-center py-2 text-text-secondary"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : currentResidence ? (
            <div className="space-y-1 text-sm">
              <div className="font-medium text-text-primary">{formatResidencePosition(currentResidence)}</div>
              <div className="text-text-secondary">
                {TEXT.assignedDate}: {new Date(currentResidence.assignedAt).toLocaleDateString('vi-VN')}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              {!student.residenceType
                ? TEXT.noResidenceData
                : student.residenceType === 'RESIDING'
                  ? TEXT.noCurrentAssignment
                  : TEXT.notResiding}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
