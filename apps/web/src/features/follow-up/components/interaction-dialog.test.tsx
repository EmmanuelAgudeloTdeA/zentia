import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import es from '../../../lang/es.json';
import { quotesService } from '../../quotes';
import { interactionsService } from '../services/interactions.service';
import { InteractionDialog } from './interaction-dialog';

const CUSTOMER_ID = '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const QUOTE_ID = '2b3c4d5e-6f70-4a81-9b2c-3d4e5f6a7b8c';

afterEach(() => {
  vi.restoreAllMocks();
});

function renderDialog(onSaved = vi.fn()) {
  vi.spyOn(quotesService, 'list').mockResolvedValue({
    items: [
      {
        id: QUOTE_ID,
        number: 12,
        displayNumber: 'COT-0012',
        status: 'SENT',
        customer: { id: CUSTOMER_ID, name: 'Acme' },
        owner: { id: CUSTOMER_ID, name: 'Ana' },
        total: '100',
        expiresAt: '2026-11-18',
        updatedAt: '2026-11-03T15:00:00.000Z',
      },
    ],
    total: 1,
    page: 1,
    pageSize: 100,
  });
  render(
    <InteractionDialog
      customerId={CUSTOMER_ID}
      customerName="Acme"
      quote={{ id: QUOTE_ID, displayNumber: 'COT-0012' }}
      onClose={vi.fn()}
      onSaved={onSaved}
    />,
  );
  return onSaved;
}

const field = (label: string) => screen.getByLabelText(new RegExp(`^${label}`));

describe('InteractionDialog', () => {
  it('rejects a future date before calling the API', async () => {
    const create = vi.spyOn(interactionsService, 'create');
    renderDialog();
    fireEvent.change(field(es.interactions.fields.occurredAt), {
      target: { value: '2099-01-01T10:00' },
    });
    expect(screen.getByText(es.interactions.futureDate)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: es.interactions.save }));
    expect(create).not.toHaveBeenCalled();
  });

  it('sends the preselected quote with the note and type', async () => {
    const create = vi.spyOn(interactionsService, 'create').mockResolvedValue({} as never);
    const onSaved = renderDialog();
    await screen.findByRole('option', { name: 'COT-0012 · Enviada' });
    fireEvent.change(field(es.interactions.fields.type), { target: { value: 'CALL' } });
    fireEvent.change(field(es.interactions.fields.note), {
      target: { value: '  Pidió descuento ' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.interactions.save }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: CUSTOMER_ID,
          quoteId: QUOTE_ID,
          type: 'CALL',
          note: 'Pidió descuento',
        }),
      ),
    );
    expect(onSaved).toHaveBeenCalled();
  });
});
