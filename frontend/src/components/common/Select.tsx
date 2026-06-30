import { forwardRef, type SelectHTMLAttributes } from 'react';
import { Edit2 } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onEdit?: () => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', onEdit, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-primary">{label}</label>
          {onEdit && props.disabled && (
            <button type="button" onClick={onEdit} className="text-text-secondary hover:text-primary transition-colors">
              <Edit2 size={14} />
            </button>
          )}
        </div>
      )}
      <select
        ref={ref}
        className={`w-full rounded-[var(--radius-sm)] border border-border bg-bg-card px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-bg-page ${error ? 'border-accent-red' : ''} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-accent-red">{error}</p>}
    </div>
  ),
);

Select.displayName = 'Select';
