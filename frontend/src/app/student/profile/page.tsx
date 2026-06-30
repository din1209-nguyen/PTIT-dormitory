'use client';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Mail, Phone, MapPin, BookOpen, User, Shield } from 'lucide-react';
import apiClient from '@/lib/api/apiClient';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { useRoomAssignmentsByStudent } from '@/features/roomAssignments/api';
import type { Student } from '@/types/student';
import type { ApiResponse } from '@/types/api';

function useMyStudent() {
  return useQuery({
    queryKey: ['students', 'me'],
    queryFn: () => apiClient.get<ApiResponse<Student | null>>('/students/me').then(r => r.data.data),
  });
}

export default function ProfilePage() {
  const { data: student, isLoading } = useMyStudent();
  const { data: assignments } = useRoomAssignmentsByStudent(student?._id || '');
  const currentResidence = assignments?.find(a => a.status === 'ACTIVE');

  if (isLoading) return <p className="py-8 text-center text-text-secondary">Đang tải...</p>;
  if (!student) return (
    <Card><p className="text-text-secondary">Chưa có hồ sơ sinh viên liên kết với tài khoản này.</p></Card>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Khung thông tin tổng quan */}
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

      {/* Chi tiết thông tin cá nhân */}
      <Card>
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-text-secondary border-b border-border pb-3">
          Thông tin chi tiết
        </h2>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-text-secondary mb-1">
              <Mail size={16} />
              <span className="text-xs font-medium">Email</span>
            </div>
            <span className="text-sm text-text-primary break-all">{student.email}</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-text-secondary mb-1">
              <Phone size={16} />
              <span className="text-xs font-medium">Điện thoại</span>
            </div>
            <span className="text-sm text-text-primary">{student.phone || '—'}</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-text-secondary mb-1">
              <MapPin size={16} />
              <span className="text-xs font-medium">Địa chỉ</span>
            </div>
            <span className="text-sm text-text-primary break-all">{student.address || '—'}</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-text-secondary mb-1">
              <BookOpen size={16} />
              <span className="text-xs font-medium">Lớp</span>
            </div>
            <span className="text-sm text-text-primary">{student.className || '—'}</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-text-secondary mb-1">
              <BookOpen size={16} />
              <span className="text-xs font-medium">Ngành</span>
            </div>
            <span className="text-sm text-text-primary">{student.major || '—'}</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-text-secondary mb-1">
              <BookOpen size={16} />
              <span className="text-xs font-medium">Khoa</span>
            </div>
            <span className="text-sm text-text-primary">{student.department || '—'}</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-text-secondary mb-1">
              <GraduationCap size={16} />
              <span className="text-xs font-medium">Khóa</span>
            </div>
            <span className="text-sm text-text-primary">{student.academicYear || '—'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
