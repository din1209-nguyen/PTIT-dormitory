'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Search, Loader2 } from 'lucide-react';

export interface SearchOption {
  value: string;
  label: string;
  sublabel?: string;
}

function useDropdownPosition(triggerRef: React.RefObject<HTMLElement | null>, open: boolean) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  const update = useCallback(() => {
    if (!triggerRef.current || !open) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 240;
    const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(showAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
  }, [triggerRef, open]);

  useEffect(() => {
    if (!open) return;
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, update]);

  return style;
}

interface SearchableSelectProps {
  label?: string;
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
  onSearch?: (keyword: string) => void;
}

export function SearchableSelect({ label, options, value, onChange, placeholder = 'Tìm kiếm...', loading, onSearch }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownStyle = useDropdownPosition(triggerRef, open);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.sublabel?.toLowerCase().includes(search.toLowerCase()))
  );

  const selected = options.find(o => o.value === value);

  function handleSearchChange(val: string) {
    setSearch(val);
    onSearch?.(val);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-text-primary">{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-[var(--radius-sm)] border border-border bg-bg-card px-3.5 py-2.5 text-sm text-left outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
      >
        {selected ? (
          <span className="truncate text-text-primary">{selected.label}{selected.sublabel ? ` — ${selected.sublabel}` : ''}</span>
        ) : (
          <span className="text-text-secondary">{placeholder}</span>
        )}
        <ChevronDown size={16} className="shrink-0 text-text-secondary" />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="animate-dropdown-in rounded-[var(--radius-sm)] border border-border bg-bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search size={14} className="text-text-secondary" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Nhập để tìm..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-text-secondary"
            />
            {search && (
              <button type="button" onClick={() => handleSearchChange('')} className="text-text-secondary hover:text-text-primary">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {loading && <div className="flex justify-center py-2 text-text-secondary"><Loader2 className="w-5 h-5 animate-spin" /></div>}
            {!loading && filtered.length === 0 && <p className="px-3 py-2 text-sm text-text-secondary">Không tìm thấy</p>}
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); setSearch(''); }}
                className={`flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-bg-page ${o.value === value ? 'bg-primary/5 text-primary' : 'text-text-primary'}`}
              >
                <span className="font-medium">{o.label}</span>
                {o.sublabel && <span className="text-xs text-text-secondary">{o.sublabel}</span>}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

interface MultiSearchableSelectProps {
  label?: string;
  options: SearchOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  loading?: boolean;
  onSearch?: (keyword: string) => void;
}

export function MultiSearchableSelect({ label, options, value, onChange, placeholder = 'Tìm kiếm...', loading, onSearch }: MultiSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownStyle = useDropdownPosition(triggerRef, open);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const filtered = options.filter(o =>
    !value.includes(o.value) && (
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.sublabel?.toLowerCase().includes(search.toLowerCase()))
    )
  );

  const selectedItems = options.filter(o => value.includes(o.value));

  function handleSearchChange(val: string) {
    setSearch(val);
    onSearch?.(val);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-text-primary">{label}</span>}
      <div
        ref={triggerRef}
        className="flex min-h-[42px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-bg-card px-3 py-2 text-sm outline-none transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20"
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        {selectedItems.map(s => (
          <span key={s.value} className="flex items-center gap-1 rounded-[var(--radius-pill)] bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {s.label}
            <button type="button" onClick={e => { e.stopPropagation(); onChange(value.filter(v => v !== s.value)); }} className="hover:text-accent-red">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={selectedItems.length === 0 ? placeholder : ''}
          className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-text-secondary"
        />
      </div>

      {open && typeof document !== 'undefined' && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="animate-dropdown-in rounded-[var(--radius-sm)] border border-border bg-bg-card shadow-lg">
          <div className="max-h-48 overflow-y-auto py-1">
            {loading && <div className="flex justify-center py-2 text-text-secondary"><Loader2 className="w-5 h-5 animate-spin" /></div>}
            {!loading && filtered.length === 0 && <p className="px-3 py-2 text-sm text-text-secondary">Không tìm thấy</p>}
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange([...value, o.value]); setSearch(''); }}
                className="flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-bg-page text-text-primary"
              >
                <span className="font-medium">{o.label}</span>
                {o.sublabel && <span className="text-xs text-text-secondary">{o.sublabel}</span>}
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
