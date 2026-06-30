'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Building2, BedDouble, User } from 'lucide-react';
import apiClient from '@/lib/api/apiClient';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import Link from 'next/link';
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

export default function ResidenceHistoryPage() {
  const [selected, setSelected] = useState<RoomAssignment | null>(null);
  const [selectedRoommate, setSelectedRoommate] = useState<Student | null>(null);

  const { data: student } = useQuery({
    queryKey: ['students', 'me'],
    queryFn: () => apiClient.get<ApiResponse<Student | null>>('/students/me').then(r => r.data.data),
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['room-assignments', 'student', student?._id],
    queryFn: () => apiClient.get<ApiResponse<RoomAssignment[]>>(`/room-assignments/student/${student?._id}`).then(r => r.data.data),
    enabled: !!student?._id,
  });

  const selectedRoomId = typeof selected?.roomId === 'object' ? selected.roomId._id : selected?.roomId;
  const selectedSemesterId = typeof selected?.semesterId === 'object' ? selected.semesterId._id : selected?.semesterId;

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['room-members', selectedRoomId, selectedSemesterId],
    queryFn: () => apiClient.get<ApiResponse<RoomAssignment[]>>(`/room-assignments/rooms/${selectedRoomId}/members`, {
      params: { semesterId: selectedSemesterId }
    }).then(r => r.data.data),
    enabled: !!selectedRoomId && !!selectedSemesterId,
  });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        {isLoading ? (
          <p className="text-sm text-text-secondary">Đang tải lịch sử lưu trú...</p>
        ) : !assignments || assignments.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8">Bạn chưa có lịch sử lưu trú nào.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border text-text-secondary">
                <th className="py-3 pr-4 font-medium w-1/3">Kỳ học</th>
                <th className="py-3 pr-4 font-medium w-1/3">Phòng</th>
                <th className="py-3 pr-4 font-medium">Trạng thái</th>
                <th className="py-3 font-medium whitespace-nowrap text-right">Ngày xếp</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(record => {
                const sem = typeof record.semesterId === 'object' ? record.semesterId : null;
                const rObj = typeof record.roomId === 'object' ? record.roomId : null;
                const bObj = typeof record.bedId === 'object' ? record.bedId : null;
                
                const roomStr = record.roomSnapshot 
                  ? `Phòng ${record.roomSnapshot.roomNumber} (Tầng ${record.roomSnapshot.floorNumber} - Dãy ${record.roomSnapshot.buildingName})` 
                  : rObj ? `Phòng ${rObj.roomNumber}` : '—';
                const bedStr = record.roomSnapshot?.bedNumber 
                  ? `Giường ${record.roomSnapshot.bedNumber}` 
                  : bObj ? `Giường ${bObj.bedNumber}` : '—';
                
                return (
                  <tr 
                    key={record._id} 
                    onClick={() => setSelected(record)} 
                    className="border-b border-border last:border-0 hover:bg-bg-page/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-4 align-top font-medium text-text-primary">
                      {sem ? sem.name : '—'}
                    </td>
                    <td className="py-3 pr-4 align-top text-text-secondary">
                      <div>{roomStr}</div>
                      <div className="text-xs">{bedStr}</div>
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <Badge value={record.status} />
                    </td>
                    <td className="py-3 align-top text-right text-text-secondary whitespace-nowrap">
                      {new Date(record.assignedAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Chi tiết kỳ lưu trú" size="lg">
        {selected && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4 p-4 bg-bg-page rounded-[var(--radius-md)] border border-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Building2 size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-base">
                  {selected.roomSnapshot 
                    ? `Dãy ${selected.roomSnapshot.buildingName} — Phòng ${selected.roomSnapshot.roomNumber}`
                    : typeof selected.roomId === 'object' ? `Phòng ${selected.roomId.roomNumber}` : 'Phòng'}
                </h3>
                <p className="text-sm text-text-secondary">
                  {selected.roomSnapshot
                    ? `Tầng ${selected.roomSnapshot.floorNumber} · Giường ${selected.roomSnapshot.bedNumber}`
                    : typeof selected.bedId === 'object' ? `Giường ${selected.bedId.bedNumber}` : ''}
                </p>
                <div className="mt-2 text-xs text-text-secondary">
                  Ngày xếp: {new Date(selected.assignedAt).toLocaleDateString('vi-VN')}
                </div>
              </div>
              <div className="ml-auto flex flex-col items-end gap-1">
                <Badge value={selected.status} />
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Users size={16} /> Bạn cùng phòng kỳ này
              </h4>
              
              {membersLoading ? (
                <p className="text-sm text-text-secondary text-center py-4">Đang tải danh sách bạn cùng phòng...</p>
              ) : !members || members.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-4">Không tìm thấy thông tin bạn cùng phòng.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {members.map(m => {
                    const s = typeof m.studentId === 'object' ? m.studentId : null;
                    const bed = typeof m.bedId === 'object' ? m.bedId : null;
                    const isMe = s?._id === student?._id;
                    
                    return (
                      <div 
                        key={m._id} 
                        onClick={() => s && setSelectedRoommate(s as Student)}
                        className={`flex items-center justify-between rounded-[var(--radius-sm)] px-4 py-3 text-sm border cursor-pointer hover:bg-bg-page/80 transition-colors ${
                          isMe ? 'bg-primary/5 border-primary/20' : 'bg-bg-page border-border'
                        }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-primary">{s?.studentCode}</span> 
                            {isMe && <Badge value="ME" />}
                          </div>
                          <span className="text-text-secondary">{s?.fullName}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 text-text-secondary">
                            <BedDouble size={14} />
                            <span className="font-medium text-text-primary">{bed?.bedNumber || m.roomSnapshot?.bedNumber}</span>
                          </div>
                          <Badge value={s?.gender || ''} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

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
