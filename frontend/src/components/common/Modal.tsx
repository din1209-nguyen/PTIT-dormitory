'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg' | 'xl' | '3xl';
}

const SIZE_MAP: Record<string, string> = {
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  '3xl': 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState<'in' | 'out' | null>(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setAnimating('in');
      document.body.style.overflow = 'hidden';
    } else if (visible) {
      setAnimating('out');
      const timer = setTimeout(() => {
        setVisible(false);
        setAnimating(null);
        document.body.style.overflow = '';
      }, 150);
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, visible]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, handleKeyDown]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/30 ${animating === 'in' ? 'animate-modal-overlay-in' : animating === 'out' ? 'animate-modal-overlay-out' : ''}`}
        onClick={onClose}
      />
      <div className={`relative z-10 w-full ${SIZE_MAP[size]} rounded-[var(--radius-lg)] bg-bg-card p-6 shadow-xl mx-4 max-h-[90vh] overflow-y-auto ${animating === 'in' ? 'animate-modal-content-in' : animating === 'out' ? 'animate-modal-content-out' : ''}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
