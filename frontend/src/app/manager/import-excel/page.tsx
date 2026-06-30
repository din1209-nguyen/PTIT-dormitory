'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Search, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { useBatchErrors, useImportBatches, useImportExcel } from '@/features/imports/api';
import { useSemesters } from '@/features/semesters/api';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Select } from '@/components/common/Select';
import apiClient from '@/lib/api/apiClient';

type PreviewAction = 'CREATE_STUDENT' | 'CREATE_ACCOUNT' | 'RE_REGISTER';

type PreviewRow = {
  rowNumber: number;
  studentCode: string;
  fullName?: string;
  email?: string;
  registeredAt?: string;
  action?: PreviewAction;
};

type PreviewError = {
  rowNumber: number;
  fieldName?: string;
  errorMessage?: string;
};

type ImportSummary = {
  createdStudents: number;
  createdAccounts: number;
  reRegistered: number;
  queuedEmails: number;
};

type ImportResult = {
  success?: boolean;
  message?: string;
  data?: {
    summary?: ImportSummary;
  };
};

function actionLabel(action?: PreviewAction) {
  if (action === 'CREATE_STUDENT') return 'Tạo mới';
  if (action === 'CREATE_ACCOUNT') return 'Tạo tài khoản';
  if (action === 'RE_REGISTER') return 'Tái đăng ký';
  return 'Hợp lệ';
}

function getImportErrorResult(err: unknown): ImportResult {
  const axiosErr = err as { response?: { data?: ImportResult } };
  return axiosErr.response?.data || {
    success: false,
    message: 'Không thể xử lý file Excel. Vui lòng kiểm tra định dạng file và dữ liệu import.',
  };
}

export default function ImportExcelPage() {
  const [semesterId, setSemesterId] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<{ validRows: PreviewRow[]; errorRows: PreviewError[] } | null>(null);
  const [errorBatchId, setErrorBatchId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'valid' | 'error'>('valid');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: semesters } = useSemesters({ limit: 50 });
  const importMut = useImportExcel();
  const { data: batches } = useImportBatches();
  const { data: batchErrors } = useBatchErrors(errorBatchId);

  const assignableSemesters = semesters?.items.filter((s) => s.status === 'PREPARING' || s.status === 'ACTIVE') || [];

  const filteredValidRows = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!previewData) return [];
    return previewData.validRows.filter((row) =>
      row.studentCode?.toLowerCase().includes(query) ||
      row.fullName?.toLowerCase().includes(query) ||
      row.email?.toLowerCase().includes(query) ||
      actionLabel(row.action).toLowerCase().includes(query),
    );
  }, [previewData, searchQuery]);

  const filteredErrorRows = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!previewData) return [];
    return previewData.errorRows.filter((error) =>
      error.errorMessage?.toLowerCase().includes(query) ||
      error.fieldName?.toLowerCase().includes(query) ||
      error.rowNumber?.toString().includes(query),
    );
  }, [previewData, searchQuery]);

  async function handleDownloadTemplate() {
    const res = await apiClient.get('/students/import-template', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-registration-import-template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  function setFile(file: File | null) {
    setSelectedFile(file);
    setPreviewData(null);
    setResult(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] || null);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Vui lòng chọn file Excel định dạng .xlsx');
      return;
    }
    setFile(file);
  }

  async function handlePreview() {
    if (!semesterId) {
      toast.error('Vui lòng chọn kỳ lưu trú đang chuẩn bị hoặc đang hoạt động.');
      return;
    }
    const file = selectedFile || fileRef.current?.files?.[0];
    if (!file) {
      toast.error('Vui lòng chọn file Excel');
      return;
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('semesterId', semesterId);
    fd.append('preview', 'true');

    try {
      const res = await importMut.mutateAsync(fd);
      const data = res.data.data as { validRows: PreviewRow[]; errorRows: PreviewError[] };
      setPreviewData(data);
      setResult(null);

      if (data.errorRows.length > 0) {
        setActiveTab('error');
        toast.error(`File Excel có ${data.errorRows.length} dòng lỗi. Vui lòng kiểm tra tab Lỗi.`);
      } else {
        setActiveTab('valid');
        toast.success(`File Excel hợp lệ: ${data.validRows.length} sinh viên.`);
      }
    } catch (err: unknown) {
      const errorResult = getImportErrorResult(err);
      toast.error(errorResult.message || 'Không thể xem trước file Excel');
      setPreviewData(null);
      setResult(errorResult);
    }
  }

  async function handleConfirmImport() {
    const file = selectedFile || fileRef.current?.files?.[0];
    if (!file || !semesterId) return;
    if (previewData?.errorRows.length) {
      toast.error('Vui lòng sửa hết lỗi trong file trước khi import');
      return;
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('semesterId', semesterId);
    fd.append('ignoreErrors', 'true');

    try {
      const res = await importMut.mutateAsync(fd);
      setResult(res.data as ImportResult);
      setPreviewData(null);
    } catch (err: unknown) {
      const errorResult = getImportErrorResult(err);
      toast.error(errorResult.message || 'Import thất bại');
      setResult(errorResult);
      setPreviewData(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="w-full lg:max-w-md">
              <Select
                label="Chọn kỳ lưu trú"
                options={assignableSemesters.map((s) => ({ value: s._id, label: `${s.name} (${s.status})` }))}
                placeholder="Chọn kỳ..."
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 lg:ml-auto">
              <Button variant="outline" onClick={handleDownloadTemplate} type="button">
                <Download size={16} /> Tải mẫu Excel
              </Button>
              <Button onClick={handlePreview} disabled={importMut.isPending}>
                <Upload size={16} /> {importMut.isPending && !previewData ? 'Đang đọc file...' : 'Xem trước dữ liệu'}
              </Button>
            </div>
          </div>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={handleDrop}
            className={`flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed px-6 py-8 text-center transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : selectedFile ? 'border-primary/50 bg-primary/5' : 'border-border bg-bg-page hover:border-primary/60 hover:bg-primary/5'
            }`}
          >
            <input ref={fileRef} type="file" accept=".xlsx" className="sr-only" onChange={handleFileChange} />
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-bg-card text-primary">
              <FileSpreadsheet size={28} />
            </div>
            <div className="text-sm font-semibold text-text-primary flex items-center justify-center gap-2">
              {selectedFile ? (
                <>
                  <span>{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="rounded-full p-1 text-text-secondary hover:bg-status-error-bg hover:text-status-error-text transition-colors"
                    title="Xóa file"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : 'Kéo thả file Excel vào đây hoặc bấm để chọn file'}
            </div>
            <div className="mt-1 text-xs text-text-secondary">Chỉ nhận file .xlsx theo mẫu import sinh viên</div>
            {selectedFile && (
              <div className="mt-3 rounded-[var(--radius-pill)] border border-border bg-bg-card px-3 py-1 text-xs font-medium text-text-secondary">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </div>
            )}
          </label>
        </div>
      </Card>

      {previewData && (
        <Card>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-text-primary">Xác nhận dữ liệu import</h2>
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" onClick={() => setPreviewData(null)}>Hủy bỏ</Button>
              <Button onClick={handleConfirmImport} disabled={importMut.isPending || previewData.validRows.length === 0 || previewData.errorRows.length > 0}>
                {importMut.isPending ? 'Đang import...' : 'Xác nhận Import'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex rounded-[var(--radius-sm)] bg-bg-page p-1">
                <button
                  onClick={() => setActiveTab('valid')}
                  className={`rounded-[var(--radius-sm)] px-4 py-1.5 text-sm font-semibold transition-colors ${activeTab === 'valid' ? 'bg-bg-card text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Hợp lệ ({previewData.validRows.length})
                </button>
                <button
                  onClick={() => setActiveTab('error')}
                  className={`rounded-[var(--radius-sm)] px-4 py-1.5 text-sm font-semibold transition-colors ${activeTab === 'error' ? 'bg-bg-card text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Lỗi ({previewData.errorRows.length})
                </button>
              </div>

              <div className="w-full sm:w-72">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    className="w-full rounded-[var(--radius-md)] border border-border bg-bg-page px-3 py-2 pl-9 text-sm text-text-primary focus:border-primary focus:outline-none"
                    placeholder="Tìm dòng, mã SV, họ tên, email, lỗi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {activeTab === 'valid' && (
              <div className="max-h-[400px] overflow-y-auto rounded border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-border bg-bg-page shadow-sm">
                    <tr>
                      <th className="p-2 font-semibold">Dòng</th>
                      <th className="p-2 font-semibold">Mã SV</th>
                      <th className="p-2 font-semibold">Họ tên</th>
                      <th className="p-2 font-semibold">Email</th>
                      <th className="p-2 font-semibold">Thời điểm đăng ký</th>
                      <th className="p-2 font-semibold">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredValidRows.length > 0 ? (
                      filteredValidRows.map((row) => (
                        <tr key={row.rowNumber} className="border-b border-border last:border-0 hover:bg-bg-page/50">
                          <td className="p-2 text-text-secondary">{row.rowNumber}</td>
                          <td className="p-2 font-medium text-text-primary">{row.studentCode}</td>
                          <td className="p-2 text-text-primary">{row.fullName || '-'}</td>
                          <td className="p-2 text-text-secondary">{row.email || '-'}</td>
                          <td className="p-2 text-text-secondary">{row.registeredAt ? new Date(row.registeredAt).toLocaleString('vi-VN') : '-'}</td>
                          <td className="p-2"><Badge value={row.action || 'VALID'} /></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-sm text-text-secondary">Không tìm thấy kết quả phù hợp</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'error' && (
              <div className="max-h-[400px] overflow-y-auto rounded border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-border bg-bg-page shadow-sm">
                    <tr>
                      <th className="p-2 font-semibold">Dòng</th>
                      <th className="p-2 font-semibold">Cột</th>
                      <th className="p-2 font-semibold">Lý do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredErrorRows.length > 0 ? (
                      filteredErrorRows.map((error, index) => (
                        <tr key={index} className="border-b border-border text-accent-red last:border-0 hover:bg-status-error-bg/30">
                          <td className="p-2">{error.rowNumber}</td>
                          <td className="p-2 font-medium">{error.fieldName || 'Chung'}</td>
                          <td className="p-2">{error.errorMessage}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-sm text-text-secondary">Không tìm thấy kết quả phù hợp</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {result && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Kết quả import</h2>
          {result.success ? (
            <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-status-completed-text/20 bg-status-completed-bg/30 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={22} className="text-status-completed-text mt-0.5" />
                <div>
                  <h3 className="text-base font-semibold text-status-completed-text">Import dữ liệu thành công!</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Danh sách sinh viên đã được đưa vào hàng chờ xếp phòng cho kỳ này. Bạn có thể tiến hành xếp phòng tự động tại trang Quản lý xếp phòng.
                  </p>
                </div>
              </div>
              
              {result.data?.summary && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-[var(--radius-sm)] border border-border bg-white p-3 shadow-sm transition-all hover:border-primary/30">
                    <div className="text-xs font-medium text-text-secondary mb-1">Sinh viên mới</div>
                    <div className="text-2xl font-bold text-primary">{result.data.summary.createdStudents}</div>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-border bg-white p-3 shadow-sm transition-all hover:border-primary/30">
                    <div className="text-xs font-medium text-text-secondary mb-1">Tài khoản mới</div>
                    <div className="text-2xl font-bold text-primary">{result.data.summary.createdAccounts}</div>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-border bg-white p-3 shadow-sm transition-all hover:border-primary/30">
                    <div className="text-xs font-medium text-text-secondary mb-1">Tái đăng ký</div>
                    <div className="text-2xl font-bold text-primary">{result.data.summary.reRegistered}</div>
                  </div>
                  <div className="rounded-[var(--radius-sm)] border border-border bg-white p-3 shadow-sm transition-all hover:border-primary/30">
                    <div className="text-xs font-medium text-text-secondary mb-1">Email đã lưu log</div>
                    <div className="text-2xl font-bold text-primary">{result.data.summary.queuedEmails}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-[var(--radius-sm)] bg-status-error-bg p-4">
              <AlertCircle size={20} className="mt-0.5 text-status-error-text" />
              <div className="text-sm">
                <p className="font-medium text-status-error-text">{result.message || 'Import thất bại'}</p>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <FileSpreadsheet size={16} /> Lịch sử import
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="py-2 pr-3 font-medium">Tệp</th>
                <th className="py-2 pr-3 font-medium">Kỳ</th>
                <th className="py-2 pr-3 font-medium">Thời gian</th>
                <th className="py-2 pr-3 font-medium">Tổng</th>
                <th className="py-2 pr-3 font-medium">Hợp lệ</th>
                <th className="py-2 pr-3 font-medium">Lỗi</th>
                <th className="py-2 pr-3 font-medium">Trạng thái</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {batches?.map((batch) => (
                <tr key={batch._id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">{batch.fileName || '-'}</td>
                  <td className="py-2 pr-3">{batch.semesterId && typeof batch.semesterId === 'object' && 'name' in batch.semesterId ? batch.semesterId.name : '-'}</td>
                  <td className="py-2 pr-3">{new Date(batch.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="py-2 pr-3">{batch.totalRows}</td>
                  <td className="py-2 pr-3">{batch.successRows}</td>
                  <td className="py-2 pr-3">{batch.failedRows}</td>
                  <td className="py-2 pr-3"><Badge value={batch.status} /></td>
                  <td className="py-2">
                    {(batch.status === 'FAILED' || batch.failedRows > 0) && (
                      <button onClick={() => setErrorBatchId(batch._id)} className="text-xs text-primary hover:underline">Xem lỗi</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {errorBatchId && batchErrors && batchErrors.length > 0 && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-accent-red">Chi tiết lỗi import</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="py-2 pr-3 font-medium">Dòng</th>
                  <th className="py-2 pr-3 font-medium">Cột</th>
                  <th className="py-2 font-medium">Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {batchErrors.map((error) => (
                  <tr key={error._id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">{error.rowNumber}</td>
                    <td className="py-2 pr-3">{error.fieldName || '-'}</td>
                    <td className="py-2">{error.errorMessage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
