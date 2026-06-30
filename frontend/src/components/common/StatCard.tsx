import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  accentColor?: string;
}

export function StatCard({ icon, label, value, accentColor = 'var(--color-accent-blue)' }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-lg)] bg-bg-card p-4 shadow-[0_4px_20px_rgba(20,40,80,0.04)]">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`, color: accentColor }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-text-secondary">{label}</p>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
      </div>
    </div>
  );
}
