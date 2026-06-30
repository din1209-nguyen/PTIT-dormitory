'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BedDouble, Users, User } from 'lucide-react';
import apiClient from '@/lib/api/apiClient';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import type { Student } from '@/types/student';
import type { RoomAssignment } from '@/types/roomAssignment';
import type { ApiResponse } from '@/types/api';

function InfoRow({ label, value, badge }: { label: string; value?: string; badge?: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-bg-card p-3">
      <div className="mb-1 text-xs font-medium text-text-secondary">{label}</div>
      <div className="break-words font-medium text-text-primary">
        {badge ? <Badge value={badge} /> : value || '—'}
      </div>
    </div>
  );
}

export default function RoomPage() {
  const [selectedRoommate, setSelectedRoommate] = useState<Student | null>(null);

  const { data: student } = useQuery({
    queryKey: ['students', 'me'],
    queryFn: () => apiClient.get<ApiResponse<Student | null>>('/students/me').then(r => r.data.data),
  });

  const { data: assignments } = useQuery({
    queryKey: ['room-assignments', 'student', student?._id],
    queryFn: () => apiClient.get<ApiResponse<RoomAssignment[]>>(`/room-assignments/student/${student?._id}`).then(r => r.data.data),
    enabled: !!student?._id,
  });

  const current = assignments?.find(a => a.status === 'ACTIVE');
  const roomSnap = current?.roomSnapshot as { buildingName?: string; floorNumber?: number; roomNumber?: string; bedNumber?: string } | undefined;

  const roomId = typeof current?.roomId === 'object' ? current.roomId._id : current?.roomId;
  const { data: members } = useQuery({
    queryKey: ['room-members', roomId],
    queryFn: () => apiClient.get<ApiResponse<RoomAssignment[]>>(`/room-assignments/rooms/${roomId}/members`).then(r => r.data.data),
    enabled: !!roomId,
  });

  if (!student) return <Card><p className="text-text-secondary">Chưa có hồ sơ sinh viên.</p></Card>;

  return (
    <div className="flex flex-col gap-6">
      {!current ? (
        <Card><p className="text-text-secondary">Bạn chưa được xếp phòng trong kỳ hiện tại.</p></Card>
      ) : (
        <>
          <Card>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><BedDouble size={24} className="text-primary" /></div>
              <div>
                <p className="text-lg font-bold">Dãy {roomSnap?.buildingName} — Phòng {roomSnap?.roomNumber}</p>
                <p className="text-sm text-text-secondary">Tầng {roomSnap?.floorNumber} · Giường {roomSnap?.bedNumber}</p>
              </div>
            </div>
          </Card>
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users size={16} /> Bạn cùng phòng ({members?.length || 0})</h2>
            <div className="flex flex-col gap-2">
              {members?.map(m => {
                const s = typeof m.studentId === 'object' ? m.studentId : null;
                const bed = typeof m.bedId === 'object' ? m.bedId : null;
                const isMe = s?._id === student?._id;
                return (
                  <div 
                    key={m._id} 
                    onClick={() => s && setSelectedRoommate(s as Student)}
                    className={`flex items-center justify-between rounded-[var(--radius-sm)] px-4 py-2.5 text-sm border cursor-pointer hover:bg-bg-page/80 transition-colors ${
                      isMe ? 'bg-primary/5 border-primary/20' : 'bg-bg-page border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">{s?.studentCode}</span>
                      <span className="text-text-secondary">{s?.fullName}</span>
                      {isMe && <Badge value="ME" />}
                    </div>
                    <div className="flex items-center gap-2"><span className="text-xs text-text-secondary">{bed?.bedNumber || m.roomSnapshot?.bedNumber}</span><Badge value={s?.gender || ''} /></div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <Modal open={!!selectedRoommate} onClose={() => setSelectedRoommate(null)} title="Thông tin sinh viên" size="lg">
        {selectedRoommate && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4 border-b border-border pb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-page text-lg font-semibold text-text-primary shrink-0">
                <User size={26} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-primary">{selectedRoommate.fullName}</h3>
                <p className="text-sm text-text-secondary">{selectedRoommate.studentCode}</p>
              </div>
            </div>
            
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <InfoRow label="Giới tính" badge={selectedRoommate.gender} />
              <InfoRow label="Email" value={selectedRoommate.email} />
              <InfoRow label="Số điện thoại" value={selectedRoommate.phone} />
              <InfoRow label="Khoa" value={selectedRoommate.department} />
              <InfoRow label="Ngành" value={selectedRoommate.major} />
              <InfoRow label="Lớp" value={selectedRoommate.className} />
              <InfoRow label="Khóa" value={selectedRoommate.academicYear} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
