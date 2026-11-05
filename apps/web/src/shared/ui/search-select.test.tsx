import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from './dialog';
import { SearchSelect } from './search-select';

const FRUITS = ['Manzana', 'Mango', 'Pera', 'Uva'];
const labels = {
  loading: 'Cargando',
  noResults: 'Sin resultados',
  error: 'Error',
  search: 'Buscar',
};

function Harness({
  onLoad = vi.fn((query: string) =>
    Promise.resolve(FRUITS.filter((fruit) => fruit.toLowerCase().includes(query.toLowerCase()))),
  ),
  onCreate,
  clearAfterSelect,
}: {
  onLoad?: (query: string) => Promise<readonly string[]>;
  onCreate?: (query: string) => void;
  clearAfterSelect?: boolean;
}) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <SearchSelect<string>
      label="Fruta"
      placeholder="Elige una fruta"
      value={value}
      loadOptions={(query) => onLoad(query)}
      getOptionKey={(fruit) => fruit}
      getOptionLabel={(fruit) => fruit}
      onSelect={setValue}
      labels={labels}
      {...(clearAfterSelect ? { clearAfterSelect } : {})}
      {...(onCreate ? { footerAction: { label: 'Crear fruta', onSelect: onCreate } } : {})}
    />
  );
}

const trigger = () => screen.getByRole('combobox', { name: 'Fruta' });

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SearchSelect', () => {
  it('lists options on open without typing, in a panel attached to body', async () => {
    const onLoad = vi.fn(() => Promise.resolve(FRUITS));
    render(<Harness onLoad={onLoad} />);
    fireEvent.click(trigger());
    await screen.findAllByRole('option');
    const listbox = screen.getByRole('listbox');
    expect(
      within(listbox)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(FRUITS);
    expect(onLoad).toHaveBeenCalledWith('');
    expect(listbox.closest('.fixed')?.parentElement).toBe(document.body);
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Buscar' }));
  });

  it('searches after typing and picks with the mouse', async () => {
    render(<Harness />);
    fireEvent.click(trigger());
    await screen.findAllByRole('option');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'manz' } });
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    fireEvent.click(screen.getByRole('option', { name: 'Manzana' }));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger().textContent).toBe('Manzana');
    expect(document.activeElement).toBe(trigger());
  });

  it('navigates with the keyboard and picks with Enter', async () => {
    render(<Harness />);
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    await screen.findAllByRole('option');
    const search = screen.getByRole('searchbox');
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(trigger().textContent).toBe('Pera');
  });

  it('closes only the panel with Escape when it lives inside a dialog', async () => {
    const onClose = vi.fn();
    render(
      <Dialog title="Producto" closeLabel="Cerrar" onClose={onClose}>
        <Harness />
      </Dialog>,
    );
    fireEvent.click(trigger());
    await screen.findAllByRole('option');
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('runs the footer action with what was typed', async () => {
    const onCreate = vi.fn();
    render(<Harness onCreate={onCreate} />);
    fireEvent.click(trigger());
    await screen.findAllByRole('option');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Kiwi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear fruta' }));
    expect(onCreate).toHaveBeenCalledWith('Kiwi');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('goes back to the placeholder after picking with clearAfterSelect', async () => {
    render(<Harness clearAfterSelect />);
    fireEvent.click(trigger());
    fireEvent.click(await screen.findByRole('option', { name: 'Uva' }));
    expect(trigger().textContent).toBe('Elige una fruta');
  });

  it('shows the error state when loading fails', async () => {
    render(<Harness onLoad={() => Promise.reject(new Error('x'))} />);
    await act(async () => {
      fireEvent.click(trigger());
    });
    expect(await screen.findByText('Error')).toBeTruthy();
  });
});
