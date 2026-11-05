import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataTable, type DataTableColumn } from './data-table';

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [
  { id: '1', name: 'Acme' },
  { id: '2', name: 'Beta' },
];
const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Nombre', cell: (row) => <a href={`/x/${row.id}`}>{row.name}</a> },
  { key: 'plain', header: 'Texto', cell: (row) => `Fila ${row.id}` },
];

function renderTable(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  render(
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      mobileCard={(row) => <span>Tarjeta {row.name}</span>}
      {...props}
    />,
  );
  return within(screen.getByRole('table'));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DataTable', () => {
  it('calls onRowClick when clicking any cell of the row and on the mobile card', () => {
    const onRowClick = vi.fn();
    const table = renderTable({ onRowClick });
    fireEvent.click(table.getByText('Fila 2'));
    expect(onRowClick).toHaveBeenLastCalledWith(rows[1]);
    expect(table.getByText('Fila 2').closest('tr')?.className).toContain('cursor-pointer');
    fireEvent.click(screen.getByText('Tarjeta Acme'));
    expect(onRowClick).toHaveBeenLastCalledWith(rows[0]);
  });

  it('ignores clicks on links, buttons and row actions (including what they open)', () => {
    const onRowClick = vi.fn();
    const table = renderTable({
      onRowClick,
      actionsHeader: 'Acciones',
      rowActions: (row) => (
        <>
          <button type="button">Ver {row.name}</button>
          <span>Acción {row.name}</span>
        </>
      ),
    });
    fireEvent.click(table.getByRole('link', { name: 'Acme' }));
    fireEvent.click(table.getByRole('button', { name: 'Ver Acme' }));
    fireEvent.click(table.getByText('Acción Acme'));
    expect(onRowClick).not.toHaveBeenCalled();
    expect(table.getByText('Acciones').className).toContain('sr-only');
    expect(screen.getAllByRole('button', { name: 'Ver Beta' })).toHaveLength(2);
  });

  it('ignores the click that ends a text selection', () => {
    const onRowClick = vi.fn();
    const table = renderTable({ onRowClick });
    vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'Fila' } as Selection);
    fireEvent.click(table.getByText('Fila 1'));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('keeps rows inert without onRowClick', () => {
    const table = renderTable();
    expect(table.getByText('Fila 1').closest('tr')?.className).not.toContain('cursor-pointer');
    expect(table.queryByText('Acciones')).toBeNull();
  });
});
