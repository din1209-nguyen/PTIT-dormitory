import { forwardRef, type InputHTMLAttributes } from 'react';
import { Edit2 } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  onEdit?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, onEdit, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <div className="flex items-center justify-between">
            <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
              {label}
            </label>
            {onEdit && props.disabled && (
              <button type="button" onClick={onEdit} className="text-text-secondary hover:text-primary transition-colors">
                <Edit2 size={14} />
              </button>
            )}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-[var(--radius-sm)] border border-border bg-bg-card px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-bg-page ${error ? 'border-accent-red' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-accent-red">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
