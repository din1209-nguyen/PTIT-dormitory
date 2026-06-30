'use client';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Lock, Unlock, Eye, Pencil, Key, Search, Users, UserCheck, Shield } from 'lucide-react';
import { useUsers, useCreateUser, useLockUser, useUnlockUser, useUser, useUpdateUser, useResetPassword } from '@/features/users/api';
import { useUpdateStudent } from '@/features/students/api';
import { useAdminDashboard } from '@/features/dashboard/api';
import { useFaculties } from '@/features/dormitories/api';
import { useAuthStore } from '@/lib/auth/authStore';
import { toast } from 'sonner';
import { Button } from '@/components/common/Button';
import { Pagination } from '@/components/common/Pagination';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { TableSkeleton } from '@/components/common/Skeleton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { StatCard } from '@/components/common/StatCard';

const MAJORS = [
  { code: 'CN', name: 'Công nghệ thông tin', dept: 'Công nghệ thông tin' },
  { code: 'AT', name: 'An toàn thông tin', dept: 'Công nghệ thông tin' },
  { code: 'VT', name: 'Kỹ thuật điện tử viễn thông', dept: 'Viễn thông' },
  { code: 'DT', name: 'Kỹ thuật điện tử', dept: 'Kỹ thuật Điện tử' },
  { code: 'PT', name: 'Công nghệ đa phương tiện', dept: 'Đa phương tiện' },
  { code: 'KT', name: 'Kế toán', dept: 'Kế toán' },
  { code: 'QT', name: 'Quản trị kinh doanh', dept: 'Quản trị kinh doanh' },
  { code: 'MR', name: 'Marketing', dept: 'Quản trị kinh doanh' }
];

export default function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user);

  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [createRole, setCreateRole] = useState('STUDENT');
  const [createUsername, setCreateUsername] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [editStudentDept, setEditStudentDept] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'lock' | 'unlock'; userId: string; username: string } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');

  // Admin chỉ được edit STUDENT và MANAGER, không được edit ADMIN khác
  const canEdit = (targetRole: string) => currentUser?.role === 'ADMIN' && targetRole !== 'ADMIN';

  const derivedAcademicYear = useMemo(() => {
    const match = createUsername.match(/^[a-zA-Z]{1,2}(\d{2})/);
    return match ? `D${match[1]}` : '';
  }, [createUsername]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useUsers({ page, limit: 10, role: role || undefined, status: status || undefined, keyword: keyword || undefined });
  const { data: faculties } = useFaculties();
  const { data: dashboardData } = useAdminDashboard();
  const { data: userDetails, isLoading: isLoadingDetails } = useUser(selectedUserId || '');
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const updateStudentMut = useUpdateStudent();
  const lockMut = useLockUser();
  const unlockMut = useUnlockUser();
  const resetMut = useResetPassword();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createMut.mutateAsync({
        username: createUsername,
        email: fd.get('email') as string,
        password: fd.get('password') as string,
        role: fd.get('role') as string,
        ...(fd.get('role') === 'STUDENT' ? {
          fullName: fd.get('fullName') as string,
          gender: fd.get('gender') as string,
          className: fd.get('className') as string,
          major: fd.get('major') as string,
          academicYear: derivedAcademicYear,
          department: selectedDept,
        } : {})
      });
      setModalOpen(false);
      setCreateUsername('');
      setSelectedDept('');
      toast.success('Tạo tài khoản thành công');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể tạo tài khoản');
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'lock') {
        await lockMut.mutateAsync(confirmAction.userId);
        toast.success(`Đã khóa tài khoản "${confirmAction.username}"`);
      } else {
        await unlockMut.mutateAsync(confirmAction.userId);
        toast.success(`Đã mở khóa tài khoản "${confirmAction.username}"`);
      }
    } catch (err) {
      toast.error((err as Error).message || 'Thao tác thất bại');
    }
    setConfirmAction(null);
  }

  async function handleEditUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedUserId) return;
    const fd = new FormData(e.currentTarget);
    const newUsername = fd.get('username') as string;
    const newEmail = fd.get('email') as string;
    const newRole = fd.get('role') as string;

    try {
      const accountChanged = userDetails && (
        newUsername !== userDetails.username ||
        newEmail !== userDetails.email ||
        (newRole && newRole !== userDetails.role)
      );

      if (accountChanged) {
        await updateMut.mutateAsync({
          id: selectedUserId,
          data: { username: newUsername, email: newEmail, role: newRole || undefined },
        });
      }

      if (userDetails?.role === 'STUDENT' && userDetails?.studentInfo) {
        const studentId = userDetails.studentInfo._id as string;
        const fullName = fd.get('fullName') as string;
        const gender = fd.get('gender') as ('MALE' | 'FEMALE');
        const className = fd.get('className') as string;
        const major = fd.get('major') as string;

        const studentChanged =
          fullName !== userDetails.studentInfo.fullName ||
          gender !== userDetails.studentInfo.gender ||
          className !== userDetails.studentInfo.className ||
          major !== userDetails.studentInfo.major ||
          editStudentDept !== userDetails.studentInfo.department;

        if (studentChanged) {
          await updateStudentMut.mutateAsync({
            id: studentId,
            data: { fullName, gender, className, major, department: editStudentDept || userDetails.studentInfo.department },
          });
        }
      }

      toast.success('Cập nhật thành công');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể cập nhật');
    }
  }

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedUserId) return;
    const fd = new FormData(e.currentTarget);
    try {
      await resetMut.mutateAsync({
        id: selectedUserId,
        newPassword: fd.get('newPassword') as string
      });
      setResetOpen(false);
      toast.success('Mật khẩu đã được đặt lại thành công. Người dùng sẽ phải đổi mật khẩu ở lần đăng nhập tới.');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể đặt lại mật khẩu');
    }
  }

  function handleGeneratePassword() {
    const randomPass = Math.random().toString(36).slice(-8);
    const el = document.getElementById('newPasswordInput') as HTMLInputElement;
    if (el) el.value = randomPass;
  }

  function openDetail(userId: string, userRole: string) {
    setSelectedUserId(userId);
    setEditStudentDept('');
    setDetailOpen(true);
    void userRole; // used implicitly via canEdit
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Users size={20} />}
          label="Tổng tài khoản"
          value={dashboardData ? String(dashboardData.totalUsers) : '...'}
          accentColor="#2563EB"
        />
        <StatCard
          icon={<UserCheck size={20} />}
          label="Tài khoản hoạt động"
          value={dashboardData ? String(dashboardData.activeUsers) : '...'}
          accentColor="#16A34A"
        />
        <StatCard
          icon={<Shield size={20} />}
          label="Phân quyền hệ thống"
          value="3 roles"
          accentColor="#7C3AED"
        />
      </div>

      <Card className="p-4 flex flex-wrap items-end gap-4">
        <Select label="Vai trò" value={role} onChange={e => { setRole(e.target.value); setPage(1); }} options={[
          { value: '', label: 'Tất cả' },
          { value: 'ADMIN', label: 'Quản trị viên' },
          { value: 'MANAGER', label: 'Cán bộ quản lý' },
          { value: 'STUDENT', label: 'Sinh viên' },
        ]} className="w-40" />

        <Select label="Trạng thái" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} options={[
          { value: '', label: 'Tất cả' },
          { value: 'ACTIVE', label: 'Hoạt động' },
          { value: 'LOCKED', label: 'Bị khóa' },
          { value: 'INACTIVE', label: 'Chưa kích hoạt' },
        ]} className="w-36" />

        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Tìm theo Username, Email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-border bg-white px-3 py-2 pl-9 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        </div>

        <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Tạo tài khoản</Button>
      </Card>

      <Card>
        {isLoading ? <div className="p-4"><TableSkeleton columns={6} rows={5} /></div> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-text-secondary">
              <th className="py-3 pr-4 font-medium">Username</th>
              <th className="py-3 pr-4 font-medium">Email</th>
              <th className="py-3 pr-4 font-medium">Vai trò</th>
              <th className="py-3 pr-4 font-medium">Trạng thái</th>
              <th className="py-3 pr-4 font-medium">Lần cuối đăng nhập</th>
              <th className="py-3 font-medium">Hành động</th>
            </tr></thead>
            <tbody>
              {data?.items.map(u => (
                <tr key={u._id} onClick={() => openDetail(u._id, u.role)} className="border-b border-border last:border-0 cursor-pointer hover:bg-bg-page transition-colors">
                  <td className="py-3 pr-4 font-medium">{u.username}</td>
                  <td className="py-3 pr-4 text-text-secondary">{u.email || '-'}</td>
                  <td className="py-3 pr-4"><Badge value={u.role} /></td>
                  <td className="py-3 pr-4"><Badge value={u.status} /></td>
                  <td className="py-3 pr-4 text-text-secondary">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : '-'}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {/* Reset mật khẩu + Lock/Unlock: chỉ khi có quyền */}
                      {canEdit(u.role) && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedUserId(u._id); setResetOpen(true); }} className="rounded p-1.5 text-text-secondary hover:bg-status-warning-text/10 hover:text-status-warning-text transition-colors" title="Đặt lại mật khẩu">
                            <Key size={16} />
                          </button>
                          {u.status === 'ACTIVE' && (
                            <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'lock', userId: u._id, username: u.username }); }} className="rounded p-1.5 text-text-secondary hover:bg-status-error-text/10 hover:text-status-error-text transition-colors" title="Khóa">
                              <Lock size={16} />
                            </button>
                          )}
                          {u.status === 'LOCKED' && (
                            <button onClick={(e) => { e.stopPropagation(); setConfirmAction({ type: 'unlock', userId: u._id, username: u.username }); }} className="rounded p-1.5 text-text-secondary hover:bg-status-success-text/10 hover:text-status-success-text transition-colors" title="Mở khóa">
                              <Unlock size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-text-secondary">Không có tài khoản nào</td></tr>}
            </tbody>
          </table>
        )}
        {data && data.pagination.totalPages > 1 && (
          <Pagination currentPage={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        )}
      </Card>

      {/* ── Tạo tài khoản ── */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setCreateUsername(''); setSelectedDept(''); }} title="Tạo tài khoản mới">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Username" name="username" required value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} placeholder="Nhập mã sinh viên nếu Role = Student" />
          <Input label="Email" name="email" type="email" required />
          <Input label="Mật khẩu" name="password" type="password" required />
          <Select label="Vai trò" name="role" value={createRole} onChange={(e) => setCreateRole(e.target.value)} options={[
            { value: 'STUDENT', label: 'Sinh viên' },
            { value: 'MANAGER', label: 'Cán bộ quản lý' },
          ]} />

          {createRole === 'STUDENT' && (
            <div className="grid grid-cols-2 gap-4 rounded-md border border-border p-4 bg-bg-page/50">
              <div className="col-span-2">
                <Input label="Họ và tên" name="fullName" required placeholder="VD: Nguyễn Văn A" />
              </div>
              <Select label="Giới tính" name="gender" options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }]} />
              <Input label="Lớp" name="className" required placeholder="VD: D24CQCN01-N" />
              <Select label="Khoa" name="department" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} options={faculties?.map(f => ({ value: f, label: f })) || []} placeholder="Chọn khoa" />
              <Select label="Ngành" name="major" options={MAJORS.filter(m => m.dept === selectedDept).map(m => ({ value: m.name, label: m.name }))} placeholder="Chọn ngành" disabled={!selectedDept} />
              <div className="col-span-2">
                <Input label="Khóa (Tự động tạo)" name="academicYear" value={derivedAcademicYear} readOnly className="bg-bg-page text-text-secondary" />
              </div>
            </div>
          )}

          <Button type="submit" loading={createMut.isPending} className="mt-2">Tạo tài khoản</Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmAction?.type === 'lock' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
        message={confirmAction?.type === 'lock'
          ? `Bạn có chắc muốn khóa tài khoản "${confirmAction?.username}"? Người dùng này sẽ không thể đăng nhập.`
          : `Bạn có chắc muốn mở khóa tài khoản "${confirmAction?.username}"?`}
        variant={confirmAction?.type === 'lock' ? 'danger' : 'info'}
        confirmText={confirmAction?.type === 'lock' ? 'Khóa' : 'Mở khóa'}
        loading={lockMut.isPending || unlockMut.isPending}
      />

      {/* ── Chi tiết & Cập nhật (modal gộp) ── */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={userDetails ? `Chi tiết: ${userDetails.username}` : 'Chi tiết tài khoản'}
        size="3xl"
      >
        {isLoadingDetails ? (
          <div className="p-4"><TableSkeleton columns={2} rows={4} /></div>
        ) : userDetails ? (
          <form onSubmit={handleEditUser} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Cột trái: Thông tin hệ thống + Tài khoản */}
            <div className="flex flex-col gap-6">
              
              <div className="rounded-md border border-border bg-bg-page/40 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">Thông tin hệ thống</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <span className="text-text-secondary">ID</span>
                  <span className="font-mono text-xs text-text-primary break-all">{userDetails._id}</span>
                  <span className="text-text-secondary">Trạng thái</span>
                  <span><Badge value={userDetails.status} /></span>
                  <span className="text-text-secondary">Lần cuối đăng nhập</span>
                  <span className="text-text-primary">{userDetails.lastLoginAt ? new Date(userDetails.lastLoginAt).toLocaleString('vi-VN') : '-'}</span>
                  <span className="text-text-secondary">Ngày tạo</span>
                  <span className="text-text-primary">{new Date(userDetails.createdAt).toLocaleString('vi-VN')}</span>
                  {userDetails.studentInfo?.residenceType && (
                    <>
                      <span className="text-text-secondary">Loại cư trú</span>
                      <span><Badge value={userDetails.studentInfo.residenceType} /></span>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-border bg-bg-page/40 p-4 flex flex-col gap-4 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Tài khoản</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Username"
                    name="username"
                    defaultValue={userDetails.username}
                    required
                    readOnly={!canEdit(userDetails.role)}
                    className={!canEdit(userDetails.role) ? 'bg-bg-page text-text-secondary' : ''}
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    defaultValue={userDetails.email || ''}
                    required
                    readOnly={!canEdit(userDetails.role)}
                    className={!canEdit(userDetails.role) ? 'bg-bg-page text-text-secondary' : ''}
                  />
                </div>
                <div>
                  <Select
                    label="Vai trò"
                    name="role"
                    defaultValue={userDetails.role}
                    options={[
                      { value: 'ADMIN', label: 'Quản trị viên' },
                      { value: 'MANAGER', label: 'Cán bộ quản lý' },
                      { value: 'STUDENT', label: 'Sinh viên' },
                    ]}
                    disabled={!canEdit(userDetails.role) || userDetails.role === 'STUDENT' || userDetails.role === 'MANAGER'}
                  />
                  {userDetails.role === 'STUDENT' && (
                    <p className="mt-1 text-xs text-text-secondary italic">* Không thể đổi Role của Sinh viên vì sẽ ảnh hưởng đến hồ sơ liên quan.</p>
                  )}
                  {userDetails.role === 'MANAGER' && (
                    <p className="mt-1 text-xs text-text-secondary italic">* Không thể hạ Role của Cán bộ quản lý.</p>
                  )}
                </div>
                
                {canEdit(userDetails.role) && (
                  <div className="mt-auto flex justify-end pt-4">
                    <Button type="submit" loading={updateMut.isPending || updateStudentMut.isPending}>
                      Lưu thay đổi
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Cột phải: Thông tin sinh viên (nếu có) */}
            <div className="flex flex-col gap-6">
              {userDetails.role === 'STUDENT' && userDetails.studentInfo ? (
                <div className="rounded-md border border-border bg-bg-page/40 p-4 flex flex-col gap-4 h-full">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Thông tin cá nhân sinh viên</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Họ và tên"
                        name="fullName"
                        defaultValue={userDetails.studentInfo.fullName}
                        required
                        readOnly={!canEdit(userDetails.role)}
                        className={!canEdit(userDetails.role) ? 'bg-bg-page text-text-secondary' : ''}
                      />
                    </div>
                    <Select
                      label="Giới tính"
                      name="gender"
                      defaultValue={userDetails.studentInfo.gender}
                      options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }]}
                      disabled={!canEdit(userDetails.role)}
                    />
                    <Input
                      label="Lớp"
                      name="className"
                      defaultValue={userDetails.studentInfo.className}
                      readOnly={!canEdit(userDetails.role)}
                      className={!canEdit(userDetails.role) ? 'bg-bg-page text-text-secondary' : ''}
                    />
                    <Input
                      label="Mã sinh viên"
                      name="studentCode"
                      defaultValue={userDetails.studentInfo.studentCode}
                      readOnly
                      className="bg-bg-page text-text-secondary"
                    />
                    <Input
                      label="Khóa học"
                      name="academicYear"
                      defaultValue={userDetails.studentInfo.academicYear}
                      readOnly
                      className="bg-bg-page text-text-secondary"
                    />
                    <Select
                      label="Khoa"
                      name="department"
                      value={editStudentDept || userDetails.studentInfo.department || ''}
                      onChange={(e) => setEditStudentDept(e.target.value)}
                      options={faculties?.map(f => ({ value: f, label: f })) || []}
                      placeholder="Chọn khoa"
                      disabled={!canEdit(userDetails.role)}
                    />
                    <Select
                      label="Ngành"
                      name="major"
                      defaultValue={userDetails.studentInfo.major}
                      options={MAJORS
                        .filter(m => m.dept === (editStudentDept || userDetails.studentInfo?.department))
                        .map(m => ({ value: m.name, label: m.name }))}
                      placeholder="Chọn ngành"
                      disabled={!canEdit(userDetails.role) || (!editStudentDept && !userDetails.studentInfo.department)}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-bg-page/20 p-8 flex flex-col items-center justify-center h-full text-center text-text-secondary text-sm">
                  <span className="mb-2 block rounded-full bg-bg-secondary p-3">
                    <UserCheck size={24} className="text-text-muted" />
                  </span>
                  Tài khoản {userDetails.role} không sử dụng hồ sơ sinh viên liên kết.
                </div>
              )}
            </div>

          </form>
        ) : (
          <div className="py-4 text-center text-text-secondary">Không tìm thấy thông tin.</div>
        )}
      </Modal>

      {/* ── Đặt lại mật khẩu ── */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Đặt lại mật khẩu">
        {userDetails && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              Đặt lại mật khẩu cho tài khoản <span className="font-semibold text-text-primary">{userDetails.username}</span>.
            </p>
            <div>
              <Input id="newPasswordInput" label="Mật khẩu mới" name="newPassword" type="text" required placeholder="Nhập ít nhất 6 ký tự" />
              <button type="button" onClick={handleGeneratePassword} className="mt-2 text-xs text-primary hover:underline font-medium">
                Tạo mật khẩu ngẫu nhiên
              </button>
            </div>
            <Button type="submit" loading={resetMut.isPending} className="mt-2" variant="danger">Xác nhận đặt lại</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
