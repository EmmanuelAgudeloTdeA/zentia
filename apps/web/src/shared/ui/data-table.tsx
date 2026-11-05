import type { MouseEvent, ReactNode } from 'react';
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
  /** Hace clicable toda la fila; la primera celda debe conservar el enlace real para teclado. */
  onRowClick?: (row: T) => void;
  /** Acciones de la fila: última columna en tabla y pie de la tarjeta en móvil. */
  rowActions?: (row: T) => ReactNode;
  /** Encabezado accesible de la columna de acciones (ya traducido). */
  actionsHeader?: string;
}

const INTERACTIVE = 'a, button, input, select, textarea, label, [role="menu"], [role="dialog"]';

/** Las acciones de la fila (y los diálogos que abren) nunca disparan `onRowClick`. */
const stopPropagation = (event: MouseEvent<HTMLElement>) => event.stopPropagation();

/** Ignora clics en controles internos y los que terminan una selección de texto. */
function isRowClick(event: MouseEvent<HTMLElement>): boolean {
  const target = event.target as HTMLElement;
  if (target.closest(INTERACTIVE)) return false;
  return !window.getSelection()?.toString();
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
  onRowClick,
  rowActions,
  actionsHeader,
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
  const clickable = onRowClick ? 'cursor-pointer' : '';
  const handleClick = (row: T) =>
    onRowClick
      ? (event: MouseEvent<HTMLElement>) => {
          if (isRowClick(event)) onRowClick(row);
        }
      : undefined;

  return (
    <>
      <ul className="divide-y divide-neutral-200 sm:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            onClick={handleClick(row)}
            className={`p-4 ${onRowClick ? 'cursor-pointer active:bg-neutral-50' : ''}`}
          >
            {mobileCard(row)}
            {rowActions ? (
              <div onClick={stopPropagation} className="mt-2 flex items-center justify-end gap-1">
                {rowActions(row)}
              </div>
            ) : null}
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
              {rowActions ? (
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">{actionsHeader}</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={handleClick(row)}
                className={`h-14 hover:bg-neutral-50 ${clickable}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-2 text-body text-neutral-800 ${align(column)} ${visibility(column)}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
                {rowActions ? (
                  <td className="px-4 py-2 text-right" onClick={stopPropagation}>
                    <div className="flex items-center justify-end gap-1">{rowActions(row)}</div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
