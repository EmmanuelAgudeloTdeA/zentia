import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { InteractionDto } from '@zentia/shared';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import es from '../../../lang/es.json';
import { interactionsService } from '../services/interactions.service';
import { FollowUpSection } from './follow-up-section';

const CUSTOMER_ID = '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const QUOTE_ID = '2b3c4d5e-6f70-4a81-9b2c-3d4e5f6a7b8c';

afterEach(() => {
  vi.restoreAllMocks();
});

function interaction(index: number): InteractionDto {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    customerId: CUSTOMER_ID,
    quote: { id: QUOTE_ID, displayNumber: 'COT-0012' },
    type: 'CALL',
    note: `Nota ${index}`,
    occurredAt: '2026-11-03T15:00:00.000Z',
    author: { id: CUSTOMER_ID, name: 'Ana' },
    createdAt: '2026-11-03T15:00:00.000Z',
  };
}

function section() {
  // Igual que el detalle de cotización: un objeto literal nuevo en cada render.
  return (
    <MemoryRouter>
      <FollowUpSection
        customerId={CUSTOMER_ID}
        customerName="Acme"
        quote={{ id: QUOTE_ID, displayNumber: 'COT-0012' }}
      />
    </MemoryRouter>
  );
}

describe('FollowUpSection', () => {
  it('does not refetch when the parent re-renders with an equivalent quote', async () => {
    const list = vi
      .spyOn(interactionsService, 'list')
      .mockResolvedValue({ items: [interaction(1)], total: 1, page: 1, pageSize: 10 });
    const { rerender } = render(section());
    expect(await screen.findByText('Nota 1')).toBeTruthy();
    rerender(section());
    rerender(section());
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    expect(list).toHaveBeenCalledWith({ quoteId: QUOTE_ID, page: 1, pageSize: 10 });
  });

  it('keeps the older pages loaded across parent re-renders', async () => {
    const firstPage = Array.from({ length: 10 }, (_, index) => interaction(index + 1));
    const list = vi
      .spyOn(interactionsService, 'list')
      .mockResolvedValueOnce({ items: firstPage, total: 11, page: 1, pageSize: 10 })
      .mockResolvedValueOnce({ items: [interaction(11)], total: 11, page: 2, pageSize: 10 });
    const { rerender } = render(section());
    fireEvent.click(await screen.findByRole('button', { name: es.interactions.loadOlder }));
    expect(await screen.findByText('Nota 11')).toBeTruthy();
    rerender(section());
    expect(screen.getByText('Nota 1')).toBeTruthy();
    expect(screen.getByText('Nota 11')).toBeTruthy();
    expect(list).toHaveBeenCalledTimes(2);
  });
});
