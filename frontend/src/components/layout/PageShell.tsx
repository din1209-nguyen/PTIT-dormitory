'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { Role } from '@/lib/auth/authStore';

export function PageShell({ role, children }: { role: Role; children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />
      <div 
        className={`flex flex-1 flex-col transition-all duration-300 ${isExpanded ? 'ml-[240px]' : 'ml-[72px]'}`}
      >
        <Topbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
