import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { CompanySettingsDto, HistoryEntryDto, QuoteDto } from '@zentia/shared';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../core/errors';
import { PrivateLayout } from '../../../core/layout';
import es from '../../../lang/es.json';
import { signIn } from '../../../test/session-fixture';
import { companyService } from '../../company-settings';
import { quotesService } from '../services/quotes.service';
import { QuoteDetailPage } from './quote-detail-page';
import { EditQuotePage } from './quote-editor-page';

const QUOTE_ID = '2b3c4d5e-6f70-4a81-9b2c-3d4e5f6a7b8c';

function quoteFixture(overrides: Partial<QuoteDto> = {}): QuoteDto {
  return {
    id: QUOTE_ID,
    number: 12,
    displayNumber: 'COT-0012',
    status: 'SENT',
    customer: {
      id: '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
      name: 'Acme SAS',
      documentId: '9001234567',
      isActive: true,
    },
    owner: { id: '7b0f5c4e-0d5a-4a43-9d8a-6b8f2f3b1c11', name: 'Ana Gómez' },
    createdBy: { id: '7b0f5c4e-0d5a-4a43-9d8a-6b8f2f3b1c11', name: 'Ana Gómez' },
    total: '5375000',
    expiresAt: '2099-12-31',
    updatedAt: '2026-11-03T15:00:00.000Z',
    items: [
      {
        id: '4c5d6e7f-8091-4a2b-8c3d-4e5f6a7b8c9d',
        productId: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
        productName: 'Portátil',
        category: 'Tecnología',
        unitPrice: '2500000',
        vatRate: 'GENERAL_19',
        quantity: '2',
        lineAmount: '5000000',
      },
    ],
    discountPct: '10',
    discountAmount: '500000',
    shippingAmount: '20000',
    shippingTaxable: false,
    subtotal: '5000000',
    linesVat: '855000',
    shippingVat: '0',
    sentAt: '2026-11-03T15:00:00.000Z',
    firstSentAt: '2026-11-03T15:00:00.000Z',
    approvedAt: null,
    currentVersion: 1,
    voidReason: null,
    allowedActions: ['edit', 'approve', 'reject', 'changeExpiry', 'void'],
    createdAt: '2026-11-01T15:00:00.000Z',
    ...overrides,
  };
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <PrivateLayout navItems={[]} />,
        children: [
          { path: '/quotes/:id', element: <QuoteDetailPage /> },
          { path: '/quotes/:id/edit', element: <EditQuotePage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const total = () => screen.getByTestId('totals-total').textContent?.replace(/\s/g, ' ');

beforeEach(() => {
  signIn('SELLER', { id: '7b0f5c4e-0d5a-4a43-9d8a-6b8f2f3b1c11' });
  vi.spyOn(companyService, 'getSettings').mockResolvedValue({
    discountLimitSeller: '10',
    discountLimitManager: '30',
    discountLimitAdmin: '30',
    validityDays: 15,
    expiringAlertDays: 3,
    shippingTaxable: false,
  } as CompanySettingsDto);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('QuoteEditor', () => {
  it('previews the same totals as the API and recalculates live', async () => {
    vi.spyOn(quotesService, 'get').mockResolvedValue(quoteFixture());
    renderAt(`/quotes/${QUOTE_ID}/edit`);

    await screen.findByText('Editar COT-0012');
    expect(total()).toBe('$ 5.375.000');
    fireEvent.change(screen.getByLabelText(`${es.quotes.editor.quantity} Portátil`), {
      target: { value: '3' },
    });
    expect(total()).toBe('$ 8.052.500');
  });

  it('asks what the customer requested before saving a sent quote', async () => {
    vi.spyOn(quotesService, 'get').mockResolvedValue(quoteFixture());
    const update = vi.spyOn(quotesService, 'update').mockResolvedValue({
      quote: quoteFixture({ currentVersion: 2 }),
      changed: true,
      versionNumber: 2,
    });
    const router = renderAt(`/quotes/${QUOTE_ID}/edit`);
    await screen.findByText('Editar COT-0012');
    fireEvent.change(screen.getByLabelText(`${es.quotes.editor.quantity} Portátil`), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: es.quotes.editor.saveChanges })[0]!);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Se creará la versión 2 con estos cambios.')).toBeTruthy();
    fireEvent.change(
      within(dialog).getByLabelText(
        new RegExp(es.quotes.customerRequest.label.replace('?', '\\?')),
      ),
      {
        target: { value: 'Una unidad más' },
      },
    );
    fireEvent.click(within(dialog).getByRole('button', { name: es.quotes.customerRequest.save }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(QUOTE_ID, {
        customerRequest: 'Una unidad más',
        items: [
          {
            id: '4c5d6e7f-8091-4a2b-8c3d-4e5f6a7b8c9d',
            productId: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
            quantity: '3',
          },
        ],
        discountPct: '10',
        shippingAmount: '20000',
        updatedAt: '2026-11-03T15:00:00.000Z',
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe(`/quotes/${QUOTE_ID}`));
  });

  it('offers to reload on a concurrent change', async () => {
    const get = vi
      .spyOn(quotesService, 'get')
      .mockResolvedValue(
        quoteFixture({ status: 'DRAFT', allowedActions: ['edit', 'send', 'void'] }),
      );
    vi.spyOn(quotesService, 'update').mockRejectedValue(new ApiError('QUOTE_CONFLICT', 409));
    renderAt(`/quotes/${QUOTE_ID}/edit`);
    await screen.findByText('Editar COT-0012');
    fireEvent.click(screen.getAllByRole('button', { name: es.quotes.editor.saveChanges })[0]!);

    expect(await screen.findByText(es.quotes.editor.conflict)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: es.quotes.editor.reload }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it('blocks a seller from raising the discount above the limit', async () => {
    vi.spyOn(quotesService, 'get').mockResolvedValue(
      quoteFixture({ status: 'DRAFT', allowedActions: ['edit'] }),
    );
    const update = vi.spyOn(quotesService, 'update');
    renderAt(`/quotes/${QUOTE_ID}/edit`);
    await screen.findByText('Editar COT-0012');
    await screen.findByText('Tu límite: 10 %');
    fireEvent.change(screen.getByLabelText(new RegExp(`^${es.quotes.editor.discountPct}`)), {
      target: { value: '15' },
    });
    expect(screen.getByText('Supera tu límite de descuento (10 %).')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: es.quotes.editor.saveChanges })[0]!);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('QuoteDetailPage', () => {
  const history: HistoryEntryDto[] = [
    {
      kind: 'EVENT',
      at: '2026-11-04T05:05:00.000Z',
      actor: null,
      event: {
        id: '6d7e8f90-a1b2-4c3d-8e4f-5a6b7c8d9e0f',
        type: 'EXPIRY_CHANGED',
        at: '2026-11-04T05:05:00.000Z',
        actor: null,
        note: null,
        data: { from: '2026-11-18', to: '2026-12-01' },
      },
    },
  ];

  it('shows the actions allowed by the API and the system actor in the history', async () => {
    vi.spyOn(quotesService, 'get').mockResolvedValue(quoteFixture());
    vi.spyOn(quotesService, 'history').mockResolvedValue(history);
    renderAt(`/quotes/${QUOTE_ID}`);

    expect(await screen.findByRole('button', { name: es.quotes.actions.approve })).toBeTruthy();
    expect(screen.getByRole('button', { name: es.quotes.actions.void })).toBeTruthy();
    expect(screen.queryByRole('button', { name: es.quotes.actions.duplicate })).toBeNull();
    expect(await screen.findByText(/Sistema · 04\/11\/2026 00:05/)).toBeTruthy();
    expect(screen.getByText('Vencimiento 18/11/2026 → 01/12/2026')).toBeTruthy();
  });

  it('approves after confirmation and refreshes the badge', async () => {
    vi.spyOn(quotesService, 'get').mockResolvedValue(quoteFixture());
    vi.spyOn(quotesService, 'history').mockResolvedValue([]);
    const changeStatus = vi
      .spyOn(quotesService, 'changeStatus')
      .mockResolvedValue(quoteFixture({ status: 'APPROVED', allowedActions: ['duplicate'] }));
    renderAt(`/quotes/${QUOTE_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: es.quotes.actions.approve }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: es.quotes.actions.approve }));

    await waitFor(() =>
      expect(changeStatus).toHaveBeenCalledWith(QUOTE_ID, {
        to: 'APPROVED',
        updatedAt: '2026-11-03T15:00:00.000Z',
      }),
    );
    expect(await screen.findByRole('button', { name: es.quotes.actions.duplicate })).toBeTruthy();
  });
});
