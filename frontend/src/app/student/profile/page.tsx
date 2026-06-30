'use client';

import { useQuery } from '@tanstack/react-query';
import { GraduationCap, User, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api/apiClient';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { useRoomAssignmentsByStudent } from '@/features/roomAssignments/api';
import type { Student } from '@/types/student';
import type { ApiResponse } from '@/types/api';

function useMyStudent() {
  return useQuery({
    queryKey: ['students', 'me'],
    queryFn: () => apiClient.get<ApiResponse<Student | null>>('/students/me').then(response => response.data.data),
  });
}

function InfoRow({ label, value, badge }: { label: string; value?: string; badge?: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-bg-card p-3">
      <div className="mb-1 text-xs font-medium text-text-secondary">{label}</div>
      <div className="break-words font-medium text-text-primary">
        {badge ? <Badge value={badge} /> : value || 'Chưa cập nhật'}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: student, isLoading } = useMyStudent();
  const { data: assignments } = useRoomAssignmentsByStudent(student?._id || '');
  const currentResidence = assignments?.find(assignment => assignment.status === 'ACTIVE');

  if (isLoading) {
    return <div className="flex justify-center py-8 text-text-secondary"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!student) {
    return (
      <Card><p className="text-text-secondary">Chưa có hồ sơ sinh viên liên kết với tài khoản này.</p></Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Hiển thị thông tin tổng quan sinh viên */}
      <Card className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 relative">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User size={48} />
        </div>
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1">
          <h1 className="text-2xl font-bold text-text-primary mb-1">{student.fullName}</h1>
          <p className="text-sm font-medium text-text-secondary mb-4 flex items-center justify-center sm:justify-start gap-2">
            <GraduationCap size={16} />
            {student.studentCode}
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <Badge value={student.gender} />
            <Badge value={student.residenceType} />
            {student.isFreshman && <Badge value="Tân SV" className="bg-[#DBEAFE] text-[#1D4ED8]" />}
          </div>
        </div>

        {currentResidence && currentResidence.semesterId && typeof currentResidence.semesterId !== 'string' && (
          <div className="sm:absolute sm:top-6 sm:right-6 flex flex-col items-center sm:items-end text-center sm:text-right bg-bg-page px-4 py-3 rounded-[var(--radius-md)] border border-border mt-4 sm:mt-0 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">{currentResidence.semesterId.name}</span>
              <Badge value={currentResidence.semesterId.status} />
            </div>
            {currentResidence.semesterId.startDate && currentResidence.semesterId.endDate && (
              <span className="text-xs font-medium text-text-secondary mt-1">
                {new Date(currentResidence.semesterId.startDate).toLocaleDateString('vi-VN')} - {new Date(currentResidence.semesterId.endDate).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Hiển thị thông tin cá nhân chi tiết */}
      <Card>
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-text-secondary border-b border-border pb-3">
          Thông tin chi tiết
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <InfoRow label="Giới tính" badge={student.gender} />
          <InfoRow label="Email" value={student.email} />
          <InfoRow label="Số điện thoại" value={student.phone} />
          <InfoRow label="Địa chỉ" value={student.address} />
          <InfoRow label="Khoa" value={student.department} />
          <InfoRow label="Ngành" value={student.major} />
          <InfoRow label="Lớp" value={student.className} />
          <InfoRow label="Khóa" value={student.academicYear} />
        </div>
      </Card>
    </div>
  );
}
