import { Button } from './button';
import { ArrowLeftIcon, ArrowRightIcon } from './icons';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Texto "1–20 de 134" ya traducido. */
  summary: (range: { from: number; to: number; total: number }) => string;
  previousLabel: string;
  nextLabel: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  summary,
  previousLabel,
  nextLabel,
}: PaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className="flex items-center justify-between gap-4 border-t border-neutral-200 px-4 py-3">
      <p className="text-body-sm text-neutral-600 tabular-nums">{summary({ from, to, total })}</p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<ArrowLeftIcon size={16} />}
          aria-label={previousLabel}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        <Button
          variant="secondary"
          size="sm"
          icon={<ArrowRightIcon size={16} />}
          aria-label={nextLabel}
          disabled={to >= total}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </nav>
  );
}
