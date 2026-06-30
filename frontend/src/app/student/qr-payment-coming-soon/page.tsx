'use client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/common/Button';
import { QrCode, ArrowLeft, Construction } from 'lucide-react';
import { Card } from '@/components/common/Card';

export default function QrPaymentComingSoonPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
      <Card className="max-w-md w-full p-8 flex flex-col items-center gap-6">
        <div className="h-24 w-24 bg-primary/10 text-primary rounded-full flex items-center justify-center">
          <QrCode size={48} />
        </div>
        
        <div className="space-y-2">
          <p className="text-text-secondary">
            Cảm ơn bạn đã trải nghiệm chức năng thanh toán qua mã QR (VietQR). Hệ thống thanh toán trực tiếp qua ngân hàng đang được đội ngũ kỹ sư tích cực xây dựng và sẽ sớm ra mắt trong bản cập nhật tới!
          </p>
        </div>

        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-3 rounded-lg text-sm w-full">
          <Construction size={20} className="shrink-0" />
          <span className="text-left font-medium">Coming soon in Version 2.0</span>
        </div>

        <Button onClick={() => router.back()} className="w-full mt-4" variant="outline">
          <ArrowLeft size={16} /> Quay lại trang trước
        </Button>
      </Card>
    </div>
  );
}
