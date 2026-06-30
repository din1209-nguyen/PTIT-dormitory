import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  function getPageNumbers() {
    const pages: (number | string)[] = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }

  return (
    <div className="mt-4 flex items-center justify-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        className="px-2"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft size={16} />
      </Button>
      
      {getPageNumbers().map((p, i) => (
        <button
          key={i}
          onClick={() => {
            if (p === '...') {
              const target = window.prompt(`Nhập số trang muốn đến (1 - ${totalPages}):`, '');
              if (target) {
                const num = parseInt(target, 10);
                if (!isNaN(num) && num >= 1 && num <= totalPages) {
                  onPageChange(num);
                }
              }
            } else if (typeof p === 'number') {
              onPageChange(p);
            }
          }}
          title={p === '...' ? 'Đến trang...' : `Trang ${p}`}
          className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-sm font-medium transition-colors
            ${p === '...' ? 'cursor-pointer text-text-secondary hover:bg-bg-page hover:text-text-primary' : ''}
            ${p === currentPage ? 'bg-gradient-to-r from-primary-from to-primary-to text-white shadow-sm' : typeof p === 'number' ? 'text-text-secondary hover:bg-bg-page hover:text-text-primary' : ''}
          `}
        >
          {p === '...' ? <MoreHorizontal size={14} /> : p}
        </button>
      ))}

      <Button
        variant="ghost"
        size="sm"
        className="px-2"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
