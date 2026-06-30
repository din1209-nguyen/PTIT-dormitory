import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] bg-bg-card p-5 shadow-[0_4px_20px_rgba(20,40,80,0.04)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
