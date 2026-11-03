import type { ReactNode } from 'react';
import { Skeleton } from './skeleton';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** Se oculta entre 640 y 1023 px. */
  secondary?: boolean;
}

interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Contenido cuando no hay filas (ya traducido). */
  empty?: ReactNode;
  /** Tarjeta para pantallas < 640 px. */
  mobileCard: (row: T) => ReactNode;
  caption?: string;
  skeletonRows?: number;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  mobileCard,
  caption,
  skeletonRows = 5,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3 p-4" aria-busy="true">
        {Array.from({ length: skeletonRows }, (_, index) => (
          <Skeleton key={index} className="h-10" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) return <>{empty}</>;

  const visibility = (column: DataTableColumn<T>) =>
    column.secondary ? 'hidden lg:table-cell' : '';
  const align = (column: DataTableColumn<T>) =>
    column.align === 'right' ? 'text-right tabular-nums' : 'text-left';

  return (
    <>
      <ul className="divide-y divide-neutral-200 sm:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="p-4">
            {mobileCard(row)}
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-neutral-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 text-overline text-neutral-500 uppercase ${align(column)} ${visibility(column)}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="h-14 hover:bg-neutral-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-2 text-body text-neutral-800 ${align(column)} ${visibility(column)}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
