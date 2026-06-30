'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import Link from 'next/link';

function VnpayReturnContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const txnRef = searchParams.get('txnRef');
  const isSuccess = status === 'success';

  return (
    <Card className="max-w-md text-center">
      <div className="flex flex-col items-center gap-4 py-6">
        {isSuccess ? (
          <CheckCircle2 size={64} className="text-green-500" />
        ) : (
          <XCircle size={64} className="text-red-500" />
        )}
        <p className="text-text-secondary">
          {isSuccess
            ? 'Giao dịch của bạn đã được xử lý thành công. Hóa đơn sẽ được cập nhật trong ít phút.'
            : 'Giao dịch không thành công. Vui lòng thử lại hoặc liên hệ quản lý KTX.'}
        </p>
        {txnRef && (
          <p className="text-xs text-text-secondary">Mã giao dịch: {txnRef}</p>
        )}
        <Link href="/student/bills">
          <Button variant="ghost"><ArrowLeft size={16} /> Về danh sách hóa đơn</Button>
        </Link>
      </div>
    </Card>
  );
}

export default function VnpayReturnPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page p-4">
      <Suspense fallback={<p className="text-text-secondary">Đang xử lý...</p>}>
        <VnpayReturnContent />
      </Suspense>
    </div>
  );
}
