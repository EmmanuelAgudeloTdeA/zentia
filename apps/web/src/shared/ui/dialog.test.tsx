import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './confirm-dialog';
import { Dialog } from './dialog';

afterEach(cleanup);

describe('dialogs render above every stacking context', () => {
  it('portals Dialog to document.body even inside an isolated header', () => {
    render(
      <header data-testid="header" className="isolate overflow-hidden">
        <Dialog title="Convertir en pedido" closeLabel="Cerrar" onClose={vi.fn()}>
          <p>Contenido</p>
        </Dialog>
      </header>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Convertir en pedido' });
    expect(screen.getByTestId('header').contains(dialog)).toBe(false);
    expect(dialog.closest('.fixed')?.parentElement).toBe(document.body);
  });

  it('portals ConfirmDialog to document.body', () => {
    render(
      <header data-testid="header" className="isolate">
        <ConfirmDialog
          title="¿Duplicar?"
          confirmLabel="Duplicar"
          cancelLabel="Cancelar"
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </header>,
    );
    const dialog = screen.getByRole('dialog', { name: '¿Duplicar?' });
    expect(screen.getByTestId('header').contains(dialog)).toBe(false);
    expect(dialog.closest('.fixed')?.parentElement).toBe(document.body);
  });
});
