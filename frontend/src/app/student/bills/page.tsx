'use client';
import { CreditCard, ExternalLink, Download } from 'lucide-react';
import { useMyBills } from '@/features/utilityBilling/api';
import { useCreateVnpayPayment } from '@/features/payments/api';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { TableSkeleton } from '@/components/common/Skeleton';
import { getRoomLabel, generatePDF } from '@/features/utilityBilling/utils';

function formatMoney(n: number) {
  return n.toLocaleString('vi-VN') + ' đ';
}

function InfoRow({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-[var(--radius-sm)] border ${highlight ? 'border-primary/20 bg-primary/5' : 'border-border bg-bg-page'} p-3 flex flex-col justify-between h-full`}>
      <div className={`mb-1 text-xs font-medium ${highlight ? 'text-primary' : 'text-text-secondary'}`}>{label}</div>
      <div className={`break-words font-semibold ${highlight ? 'text-primary text-base' : 'text-text-primary'}`}>{value}</div>
    </div>
  );
}

export default function StudentBillsPage() {
  const { data: members, isLoading } = useMyBills();
  const vnpayMut = useCreateVnpayPayment();

  async function handlePay(billId: string) {
    const result = await vnpayMut.mutateAsync({ billId });
    window.location.href = result.paymentUrl;
  }

  return (
    <div className="flex flex-col gap-6">
      {isLoading ? <div className="p-4"><TableSkeleton columns={3} rows={5} /></div> : (
        <div className="flex flex-col gap-3">
          {(!members || members.length === 0) && <Card><p className="text-text-secondary">Chưa có hóa đơn nào.</p></Card>}
          {members?.map(m => {
            const bill = typeof m.billId === 'object' ? m.billId : null;
            if (!bill) return null;
            return (
              <Card key={bill._id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <CreditCard size={24} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">
                        Hóa đơn tháng {bill.month}/{bill.year}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        Phòng {getRoomLabel(bill.roomId)} ({m.amountShare ? Math.round(bill.totalCost / m.amountShare) : (bill.roomMemberSnapshot?.length || 4)} thành viên)
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); generatePDF(bill); }} className="text-text-secondary hover:text-blue-600 p-1" title="Tải hóa đơn">
                        <Download size={20} />
                      </button>
                      <Badge value={m.status} />
                    </div>
                  </div>
                </div>

                {(() => {
                  const snap = bill.priceConfigSnapshot as any;
                  
                  // Extract from snapshot if available
                  const elecBeforeTax = snap?.electricBeforeVat ?? Math.round((bill.electricityCost || 0) / 1.1);
                  const elecVatAmount = snap?.electricVatAmount ?? (bill.electricityCost - elecBeforeTax);
                  
                  const waterBeforeTax = snap?.waterBeforeTax ?? Math.round((bill.waterCost || 0) / 1.15);
                  const wwFee = snap?.wastewaterFee ?? Math.round(waterBeforeTax * 0.1);
                  const waterVatAmount = snap?.waterVatAmount ?? (bill.waterCost - waterBeforeTax - wwFee);

                  const elecVatRate = snap?.electricVatRate ? `${snap.electricVatRate * 100}%` : '10%';
                  const waterVatRate = snap?.waterVatRate ? `${snap.waterVatRate * 100}%` : '5%';

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                      <InfoRow label={`Điện (${bill.electricityUsage} kWh)`} value={formatMoney(elecBeforeTax)} />
                      <InfoRow label={`Nước (${bill.waterUsage} m³)`} value={formatMoney(waterBeforeTax)} />
                      <InfoRow label="Phí BVMT (Nước)" value={formatMoney(wwFee)} />
                      <InfoRow label={`Thuế VAT Điện (${elecVatRate})`} value={formatMoney(elecVatAmount)} />
                      <InfoRow label={`Thuế VAT Nước (${waterVatRate})`} value={formatMoney(waterVatAmount)} />
                      <InfoRow label="Tổng phòng" value={formatMoney(bill.totalCost)} highlight />
                    </div>
                  );
                })()}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[var(--radius-md)] bg-bg-page p-4 border border-border">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-text-secondary">
                      Mức chia tham khảo (cho {m.amountShare ? Math.round(bill.totalCost / m.amountShare) : (bill.roomMemberSnapshot?.length || 4)} người): <span className="font-semibold text-text-primary">{formatMoney(m.amountShare || (bill.roomMemberSnapshot?.length ? Math.round(bill.totalCost / bill.roomMemberSnapshot.length) : Math.round(bill.totalCost / 4)) || 0)}</span>
                    </div>
                    <div className="text-xs text-text-secondary">
                      Hạn thanh toán: {new Date(bill.dueDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {(m.status === 'UNPAID') && (bill.status === 'UNPAID' || bill.status === 'OVERDUE') && (
                      <Button className="w-full sm:w-auto whitespace-nowrap" onClick={() => handlePay(bill._id)} disabled={vnpayMut.isPending}>
                        <ExternalLink size={16} className="mr-2" /> Thanh toán VNPay
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
