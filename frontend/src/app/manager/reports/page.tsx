'use client';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTrendReport } from '@/features/reports/api';
import { useSemesters } from '@/features/semesters/api';
import { Card } from '@/components/common/Card';
import { Users, Building2, Zap, CreditCard, AlertTriangle, MessageSquare, Loader2 } from 'lucide-react';

function formatMoney(n: number) { return n.toLocaleString('vi-VN') + ' đ'; }

export default function ReportsPage() {
  const [startSemesterId, setStartSemesterId] = useState<string>('');
  const [endSemesterId, setEndSemesterId] = useState<string>('');

  const { data: semestersRes } = useSemesters({ limit: 100 });
  const semesters = (semestersRes?.items || []).filter(s => s.status === 'ACTIVE' || s.status === 'FINISHED');

  const { data: trends, isLoading } = useTrendReport({ 
    startSemesterId: startSemesterId || undefined, 
    endSemesterId: endSemesterId || undefined 
  });

  if (isLoading) {
    return <div className="flex justify-center p-8 text-text-secondary"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!trends || trends.length === 0) {
    return <div className="p-8 text-center text-text-secondary">Chưa có dữ liệu kỳ học nào để hiển thị xu hướng.</div>;
  }

  // Lấy kỳ gần nhất để hiển thị KPI tóm tắt
  const latest = trends[trends.length - 1];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-6 bg-white p-4 rounded-[var(--radius-md)] border border-border shadow-sm w-max">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">Từ kỳ:</span>
          <select
            value={startSemesterId}
            onChange={(e) => setStartSemesterId(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-border bg-bg-page px-3 py-1.5 text-sm outline-none focus:border-primary"
          >
            <option value="">Tất cả</option>
            {semesters.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">Đến kỳ:</span>
          <select
            value={endSemesterId}
            onChange={(e) => setEndSemesterId(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-border bg-bg-page px-3 py-1.5 text-sm outline-none focus:border-primary"
          >
            <option value="">Tất cả</option>
            {semesters.map(s => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards for the latest semester */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="flex flex-col items-center justify-center p-4 text-center hover:shadow-md transition-shadow">
          <Users className="mb-2 text-blue-500" size={24} />
          <p className="text-2xl font-bold">{latest.residenceTotal}</p>
          <p className="text-xs text-text-secondary mt-1">SV lưu trú</p>
        </Card>
        <Card className="flex flex-col items-center justify-center p-4 text-center hover:shadow-md transition-shadow">
          <Building2 className="mb-2 text-green-500" size={24} />
          <p className="text-2xl font-bold">{latest.occupancyRate}%</p>
          <p className="text-xs text-text-secondary mt-1">Lấp đầy</p>
        </Card>
        <Card className="flex flex-col items-center justify-center p-4 text-center hover:shadow-md transition-shadow">
          <Zap className="mb-2 text-amber-500" size={24} />
          <p className="text-lg font-bold">{formatMoney(latest.utilityAmount)}</p>
          <p className="text-xs text-text-secondary mt-1">Tiền điện nước</p>
        </Card>
        <Card className="flex flex-col items-center justify-center p-4 text-center hover:shadow-md transition-shadow">
          <CreditCard className="mb-2 text-indigo-500" size={24} />
          <p className="text-2xl font-bold">{latest.collectionRate}%</p>
          <p className="text-xs text-text-secondary mt-1">Tỷ lệ thu</p>
        </Card>
        <Card className="flex flex-col items-center justify-center p-4 text-center hover:shadow-md transition-shadow">
          <AlertTriangle className="mb-2 text-red-500" size={24} />
          <p className="text-2xl font-bold">{latest.violationCount}</p>
          <p className="text-xs text-text-secondary mt-1">Vi phạm</p>
        </Card>
        <Card className="flex flex-col items-center justify-center p-4 text-center hover:shadow-md transition-shadow">
          <MessageSquare className="mb-2 text-teal-500" size={24} />
          <p className="text-2xl font-bold">{latest.requestCount}</p>
          <p className="text-xs text-text-secondary mt-1">Đơn từ</p>
        </Card>
      </div>

      {/* Line Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Residence & Capacity Trend */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-text-primary">Biến động SV Lưu trú & Công suất</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" unit="%" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="residenceTotal" name="Tổng SV" stroke="#3B82F6" strokeWidth={2} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="occupancyRate" name="Tỷ lệ lấp đầy (%)" stroke="#10B981" strokeWidth={2} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Utilities Trend */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-text-primary">Biến động Doanh thu Điện nước</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v) => formatMoney(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="utilityAmount" name="Tổng tiền (VNĐ)" stroke="#F59E0B" strokeWidth={2} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment Collection Trend */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-text-primary">Biến động Tỷ lệ Thu tiền</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="collectionRate" name="Tỷ lệ thu (%)" stroke="#6366F1" strokeWidth={2} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Violations & Requests Trend */}
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-text-primary">Biến động Vi phạm & Đơn từ</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="violationCount" name="Vi phạm" stroke="#EF4444" strokeWidth={2} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="requestCount" name="Đơn từ" stroke="#14B8A6" strokeWidth={2} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
