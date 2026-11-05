import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { CompanySettingsDto, HistoryEntryDto, QuoteDto, ShareLinksDto } from '@zentia/shared';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../core/errors';
import { PrivateLayout } from '../../../core/layout';
import es from '../../../lang/es.json';
import { useToastStore } from '../../../shared/ui';
import { signIn } from '../../../test/session-fixture';
import { aiService } from '../../ai/services/ai.service';
import { productsService } from '../../catalog';
import { companyService } from '../../company-settings';
import { customersService } from '../../customers';
import { interactionsService } from '../../follow-up';
import { usersService } from '../../users';
import { openQuotesWithFilters, useQuoteFiltersStore } from '../store/quote-filters.store';
import { documentsService } from '../services/documents.service';
import { quotesService } from '../services/quotes.service';
import { QuoteDetailPage } from './quote-detail-page';
import { EditQuotePage, NewQuotePage } from './quote-editor-page';
import { QuotesListPage } from './quotes-list-page';

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
          { path: '/quotes', element: <QuotesListPage /> },
          { path: '/quotes/new', element: <NewQuotePage /> },
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

  it('picks the customer and products from searchable selectors without typing', async () => {
    const fixture = quoteFixture();
    const customer = {
      ...fixture.customer,
      phone: null,
      email: 'compras@acme.co',
      createdBy: fixture.owner,
      createdAt: fixture.createdAt,
      updatedAt: fixture.updatedAt,
    };
    const listCustomers = vi
      .spyOn(customersService, 'list')
      .mockResolvedValue({ items: [customer], total: 1, page: 1, pageSize: 20 });
    const laptop = {
      id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
      name: 'Portátil',
      category: 'Tecnología',
      price: '2500000',
      vatRate: 'GENERAL_19' as const,
      isActive: true,
      createdAt: fixture.createdAt,
      updatedAt: fixture.updatedAt,
    };
    vi.spyOn(productsService, 'list').mockResolvedValue({
      items: [laptop],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    renderAt('/quotes/new');

    const customerSelect = await screen.findByRole('combobox', { name: /Cliente/ });
    fireEvent.click(customerSelect);
    fireEvent.click(await screen.findByRole('option', { name: /Acme SAS/ }));
    expect(listCustomers.mock.calls[0]?.[0]).toMatchObject({ q: undefined, status: 'active' });
    expect(customerSelect.textContent).toBe('Acme SAS');

    const productSelect = screen.getByRole('combobox', { name: es.quotes.editor.addProduct });
    fireEvent.click(productSelect);
    fireEvent.click(await screen.findByRole('option', { name: /Portátil/ }));
    expect(productSelect.textContent).toBe(es.quotes.editor.productPlaceholder);
    expect(total()).toBe('$ 2.975.000');

    fireEvent.click(productSelect);
    await waitFor(() => expect(screen.getByText(es.common.combobox.noResults)).toBeTruthy());
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

describe('DownloadPdfButton', () => {
  it('shows loading while downloading and a toast when the PDF fails', async () => {
    vi.spyOn(quotesService, 'get').mockResolvedValue(
      quoteFixture({ allowedActions: ['edit', 'downloadPdf'] }),
    );
    vi.spyOn(quotesService, 'history').mockResolvedValue([]);
    let fail: (error: unknown) => void = () => undefined;
    vi.spyOn(documentsService, 'downloadPdf').mockReturnValue(
      new Promise((_, reject) => {
        fail = reject;
      }),
    );
    renderAt(`/quotes/${QUOTE_ID}`);

    const button = await screen.findByRole('button', { name: es.quotes.actions.downloadPdf });
    fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('true'));
    expect(button.hasAttribute('disabled')).toBe(true);

    fail(new ApiError('PDF_GENERATION_FAILED', 500));
    await waitFor(() =>
      expect(useToastStore.getState().toasts.at(-1)?.message).toBe(es.errors.PDF_GENERATION_FAILED),
    );
    expect(button.hasAttribute('aria-busy')).toBe(false);
  });
});

describe('SendQuoteDialog', () => {
  const draft = () =>
    quoteFixture({
      status: 'DRAFT',
      expiresAt: null,
      sentAt: null,
      firstSentAt: null,
      currentVersion: 0,
      allowedActions: ['edit', 'send', 'void', 'downloadPdf', 'share'],
    });

  async function openDialog(quote = draft(), links: Partial<ShareLinksDto> = {}) {
    vi.spyOn(quotesService, 'get').mockResolvedValue(quote);
    vi.spyOn(quotesService, 'history').mockResolvedValue([]);
    vi.spyOn(documentsService, 'shareLinks').mockResolvedValue({
      whatsappUrl: 'https://wa.me/573001234567?text=Hola',
      emailUrl: null,
      missing: ['EMAIL'],
      unavailableReason: null,
      ...links,
    });
    renderAt(`/quotes/${QUOTE_ID}`);
    fireEvent.click(await screen.findByRole('button', { name: es.quotes.actions.share }));
    return screen.findByRole('dialog');
  }

  const EMAIL_URL =
    'mailto:a%40acme.co?subject=Cotizaci%C3%B3n%20COT-0012&body=Hola%20Acme%2C%0D%0AAdjunto%20el%20PDF.';

  it('opens the email in the same tab (no blank tab) and registers the share', async () => {
    const share = vi.spyOn(documentsService, 'share').mockResolvedValue(quoteFixture());
    let opened = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      opened = this.href;
    });
    const dialog = await openDialog(draft(), { emailUrl: EMAIL_URL, missing: [] });
    const link = await within(dialog).findByRole('link', { name: es.quotes.send.email });
    expect(link.getAttribute('target')).toBeNull();
    expect(
      within(dialog).getByRole('link', { name: es.quotes.send.whatsapp }).getAttribute('target'),
    ).toBe('_blank');

    fireEvent.click(link);
    expect(opened).toBe(EMAIL_URL);
    await waitFor(() =>
      expect(share).toHaveBeenCalledWith(QUOTE_ID, {
        channel: 'EMAIL',
        updatedAt: draft().updatedAt,
      }),
    );
  });

  it('copies the email (to, subject and body) for webmail when there is no mail app', async () => {
    const share = vi.spyOn(documentsService, 'share').mockResolvedValue(quoteFixture());
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const dialog = await openDialog(draft(), { emailUrl: EMAIL_URL, missing: [] });

    fireEvent.click(await within(dialog).findByRole('button', { name: es.quotes.send.copyEmail }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        'Para: a@acme.co\nAsunto: Cotización COT-0012\n\nHola Acme,\nAdjunto el PDF.',
      ),
    );
    await waitFor(() => expect(share).toHaveBeenCalled());
  });

  it('disables the channel without contact data and sends the draft through WhatsApp', async () => {
    const share = vi.spyOn(documentsService, 'share').mockResolvedValue(quoteFixture());
    const dialog = await openDialog();

    expect(await within(dialog).findByText(es.quotes.send.missingEmail)).toBeTruthy();
    const whatsapp = within(dialog).getByRole('link', { name: es.quotes.send.whatsapp });
    expect(whatsapp.getAttribute('href')).toBe('https://wa.me/573001234567?text=Hola');
    expect(whatsapp.getAttribute('target')).toBe('_blank');
    fireEvent.click(whatsapp);

    await waitFor(() =>
      expect(share).toHaveBeenCalledWith(QUOTE_ID, {
        channel: 'WHATSAPP',
        updatedAt: '2026-11-03T15:00:00.000Z',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getAllByText(es.enums.QuoteStatus.SENT).length).toBeGreaterThan(0);
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe('Cotización COT-0012 enviada.');
  });

  it('offers to mark as sent when registering the share fails', async () => {
    vi.spyOn(documentsService, 'share').mockRejectedValue(new ApiError('QUOTE_CONFLICT', 409));
    const dialog = await openDialog();
    fireEvent.click(await within(dialog).findByRole('link', { name: es.quotes.send.whatsapp }));

    expect(await within(dialog).findByText(es.errors.QUOTE_CONFLICT)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: es.quotes.actions.send }));
    expect(await screen.findByText('¿Marcar COT-0012 como enviada?')).toBeTruthy();
  });

  it('does not offer to mark a sent quote as sent when registering the share fails', async () => {
    vi.spyOn(documentsService, 'share').mockRejectedValue(new ApiError('QUOTE_CONFLICT', 409));
    const dialog = await openDialog(
      quoteFixture({ allowedActions: ['edit', 'void', 'downloadPdf', 'share'] }),
    );
    fireEvent.click(await within(dialog).findByRole('link', { name: es.quotes.send.whatsapp }));

    expect(await within(dialog).findByText(es.errors.QUOTE_CONFLICT)).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: es.quotes.actions.send })).toBeNull();
    expect(within(dialog).getByRole('button', { name: es.quotes.editor.reload })).toBeTruthy();
  });

  it('explains that a draft with an inactive customer cannot be sent', async () => {
    const dialog = await openDialog(draft(), {
      whatsappUrl: null,
      unavailableReason: 'CUSTOMER_INACTIVE',
    });

    expect(await within(dialog).findByText(es.quotes.send.customerInactive)).toBeTruthy();
    expect(within(dialog).queryByRole('link', { name: es.quotes.send.whatsapp })).toBeNull();
    expect(within(dialog).queryByText(es.quotes.send.noChannels)).toBeNull();
    expect(within(dialog).queryByRole('button', { name: es.quotes.actions.send })).toBeNull();
  });

  it('downloads the clean PDF from the dialog', async () => {
    const download = vi.spyOn(documentsService, 'downloadPdf').mockResolvedValue(undefined);
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: es.quotes.actions.downloadPdf }));

    await waitFor(() => expect(download).toHaveBeenCalledWith(QUOTE_ID, 'COT-0012', 'send'));
    expect(await within(dialog).findByText(es.quotes.send.downloaded)).toBeTruthy();
  });
});

describe('audit (M4)', () => {
  const OWNER_ID = '7b0f5c4e-0d5a-4a43-9d8a-6b8f2f3b1c11';
  const OTHER_ID = '8c1a6d5f-1e6b-4b54-8e9b-7c9a3a4c2d22';
  const NEW_ID = '9d2b7e6a-2f7c-4c65-9fac-8d0b4b5d3e33';
  const SERVICE_ITEM = {
    id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5e',
    productId: '6b7c8d9e-0f1a-4b2c-9d3e-4f5a6b7c8d9e',
    productName: 'Instalación',
    category: 'Servicios',
    unitPrice: '100000',
    vatRate: 'EXEMPT' as const,
    quantity: '1',
    lineAmount: '100000',
  };

  it('ReactivateDialog warns about inactive products and sends the request and the price choice', async () => {
    const expired = quoteFixture({ status: 'EXPIRED', allowedActions: ['reactivate'] });
    vi.spyOn(quotesService, 'get').mockResolvedValue(expired);
    vi.spyOn(quotesService, 'history').mockResolvedValue([]);
    vi.spyOn(quotesService, 'reactivationPreview').mockResolvedValue({
      newExpiresAt: '2026-11-18',
      lines: [
        {
          itemId: '4c5d6e7f-8091-4a2b-8c3d-4e5f6a7b8c9d',
          productId: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
          productName: 'Portátil',
          quantity: '2',
          productActive: false,
          currentPrice: '2500000',
          catalogPrice: '2500000',
        },
      ],
    });
    const reactivate = vi.spyOn(quotesService, 'reactivate').mockResolvedValue({
      quote: quoteFixture(),
      versionNumber: null,
      keptInactiveProductIds: [],
    });
    renderAt(`/quotes/${QUOTE_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: es.quotes.actions.reactivate }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(es.quotes.dialogs.reactivate.inactive)).toBeTruthy();
    fireEvent.click(within(dialog).getByLabelText(es.quotes.dialogs.reactivate.updatePrices));
    fireEvent.change(
      within(dialog).getByLabelText(new RegExp(es.quotes.dialogs.reactivate.request)),
      { target: { value: 'Sigue interesado' } },
    );
    fireEvent.click(
      within(dialog).getByRole('button', { name: es.quotes.dialogs.reactivate.submit }),
    );
    await waitFor(() =>
      expect(reactivate).toHaveBeenCalledWith(QUOTE_ID, {
        customerRequest: 'Sigue interesado',
        updatePrices: false,
        updatedAt: '2026-11-03T15:00:00.000Z',
      }),
    );
  });

  it('ReassignDialog lists users from the options service without the current owner', async () => {
    signIn('MANAGER', { id: OTHER_ID });
    vi.spyOn(quotesService, 'get').mockResolvedValue(
      quoteFixture({ allowedActions: ['approve', 'reassign'] }),
    );
    vi.spyOn(quotesService, 'history').mockResolvedValue([]);
    const options = vi.spyOn(usersService, 'options').mockResolvedValue([
      { id: OWNER_ID, name: 'Ana Gómez', role: 'SELLER', isActive: true },
      { id: OTHER_ID, name: 'Andrés Ruiz', role: 'SELLER', isActive: true },
    ]);
    const reassign = vi.spyOn(quotesService, 'reassign').mockResolvedValue(quoteFixture());
    renderAt(`/quotes/${QUOTE_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: es.quotes.detail.moreActions }));
    fireEvent.click(screen.getByRole('menuitem', { name: es.quotes.actions.reassign }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: 'an' } });
    const option = await within(dialog).findByRole('option', { name: /Andrés Ruiz/ });
    expect(options).toHaveBeenCalled();
    expect(within(dialog).queryByRole('option', { name: /Ana Gómez/ })).toBeNull();
    fireEvent.click(option);
    fireEvent.click(
      within(dialog).getByRole('button', { name: es.quotes.dialogs.reassign.submit }),
    );
    await waitFor(() =>
      expect(reassign).toHaveBeenCalledWith(QUOTE_ID, {
        ownerId: OTHER_ID,
        updatedAt: '2026-11-03T15:00:00.000Z',
      }),
    );
  });

  it('duplicates into the editor with the omitted products and the discount reset notice', async () => {
    const approved = quoteFixture({
      status: 'APPROVED',
      allowedActions: ['duplicate'],
      items: [quoteFixture().items[0]!, SERVICE_ITEM],
    });
    const copy = quoteFixture({
      id: NEW_ID,
      number: 13,
      displayNumber: 'COT-0013',
      status: 'DRAFT',
      discountPct: '0',
      allowedActions: ['edit', 'send', 'void'],
    });
    vi.spyOn(quotesService, 'get').mockImplementation(async (id) =>
      id === NEW_ID ? copy : approved,
    );
    vi.spyOn(quotesService, 'history').mockResolvedValue([]);
    vi.spyOn(quotesService, 'duplicate').mockResolvedValue({
      quote: copy,
      omittedProductIds: [SERVICE_ITEM.productId],
      discountReset: true,
    });
    const router = renderAt(`/quotes/${QUOTE_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: es.quotes.actions.duplicate }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: es.quotes.actions.duplicate }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/quotes/${NEW_ID}/edit`));
    expect(
      await screen.findByText('Se creó COT-0013 a partir de la cotización duplicada.'),
    ).toBeTruthy();
    expect(screen.getByText('Se omitieron productos inactivos: Instalación.')).toBeTruthy();
    expect(screen.getByText(es.quotes.editor.discountReset)).toBeTruthy();
  });

  it('shows the discount read-only to a seller when it exceeds the seller limit (RN-14)', async () => {
    vi.spyOn(quotesService, 'get').mockResolvedValue(
      quoteFixture({ status: 'DRAFT', discountPct: '20', allowedActions: ['edit'] }),
    );
    renderAt(`/quotes/${QUOTE_ID}/edit`);
    await screen.findByText('Editar COT-0012');
    const field = screen.getByLabelText(new RegExp(`^${es.quotes.editor.discountPct}`));
    expect(field.hasAttribute('readonly')).toBe(true);
    expect(screen.getByText(es.quotes.editor.discountLocked)).toBeTruthy();
  });

  it('does not ask for the customer request when a sent quote has no changes', async () => {
    vi.spyOn(quotesService, 'get').mockResolvedValue(quoteFixture());
    vi.spyOn(quotesService, 'history').mockResolvedValue([]);
    const update = vi.spyOn(quotesService, 'update');
    const router = renderAt(`/quotes/${QUOTE_ID}/edit`);
    await screen.findByText('Editar COT-0012');
    fireEvent.click(screen.getAllByRole('button', { name: es.quotes.editor.saveChanges })[0]!);

    await waitFor(() => expect(router.state.location.pathname).toBe(`/quotes/${QUOTE_ID}`));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(update).not.toHaveBeenCalled();
    expect(useToastStore.getState().toasts.at(-1)?.message).toBe(es.quotes.toast.noChanges);
  });

  it('shows an error with retry and disables saving when the parameters fail on a new quote', async () => {
    const getSettings = vi
      .spyOn(companyService, 'getSettings')
      .mockRejectedValueOnce(new ApiError('INTERNAL_ERROR', 500));
    renderAt('/quotes/new');

    expect(await screen.findByText(es.quotes.editor.parametersError)).toBeTruthy();
    for (const button of screen.getAllByRole('button', { name: es.quotes.editor.saveDraft })) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    fireEvent.click(screen.getByRole('button', { name: es.common.retry }));
    await waitFor(() => expect(screen.queryByText(es.quotes.editor.parametersError)).toBeNull());
    expect(getSettings).toHaveBeenCalledTimes(2);
    for (const button of screen.getAllByRole('button', { name: es.quotes.editor.saveDraft })) {
      expect((button as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it('opens the list with the first-sent period chip, sends it and lets the user remove it', async () => {
    signIn('MANAGER');
    useQuoteFiltersStore.getState().reset();
    const list = vi
      .spyOn(quotesService, 'list')
      .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    openQuotesWithFilters({
      statuses: ['APPROVED'],
      owner: { id: OWNER_ID, label: 'Ana Gómez' },
      sentPeriod: { from: '2026-10-01', to: '2026-10-31' },
    });
    renderAt('/quotes');

    const chip = await screen.findByRole('button', {
      name: 'Quitar filtro: Primer envío: 01/10/2026 – 31/10/2026',
    });
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          statuses: ['APPROVED'],
          ownerId: OWNER_ID,
          sentFrom: '2026-10-01',
          sentTo: '2026-10-31',
        }),
        expect.anything(),
      ),
    );
    fireEvent.click(chip);
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(
        expect.objectContaining({ sentFrom: undefined, sentTo: undefined, ownerId: OWNER_ID }),
        expect.anything(),
      ),
    );
    expect(screen.queryByText(/Primer envío/)).toBeNull();
    useQuoteFiltersStore.getState().reset();
  });
});

describe('pending follow-up filter', () => {
  it('sends followUp=pending with a removable chip', async () => {
    useQuoteFiltersStore.getState().reset();
    const list = vi
      .spyOn(quotesService, 'list')
      .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    openQuotesWithFilters({ statuses: ['SENT'], followUpPending: true });
    renderAt('/quotes');

    const chip = await screen.findByRole('button', {
      name: 'Quitar filtro: Pendientes de seguimiento',
    });
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(
        expect.objectContaining({ statuses: ['SENT'], followUp: 'pending' }),
        expect.anything(),
      ),
    );
    fireEvent.click(chip);
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(
        expect.objectContaining({ followUp: undefined }),
        expect.anything(),
      ),
    );
    useQuoteFiltersStore.getState().reset();
  });
});

describe('closing probability (M9)', () => {
  const APPROVED_ID = '8e9f0a1b-2c3d-4e5f-8a6b-7c8d9e0f1a2b';
  const probability = {
    quoteId: QUOTE_ID,
    probability: 35,
    label: 'RULES_ESTIMATE' as const,
    factors: [{ code: 'BASE' as const, points: 35 }],
  };

  beforeEach(() => {
    vi.spyOn(interactionsService, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 1,
    });
  });

  it('asks the probability only for the sent quotes of the list and shows "—" for the rest', async () => {
    const { id, number, displayNumber, customer, owner, total, expiresAt, updatedAt } =
      quoteFixture();
    const summary = { id, number, displayNumber, customer, owner, total, expiresAt, updatedAt };
    vi.spyOn(quotesService, 'list').mockResolvedValue({
      items: [
        { ...summary, status: 'SENT' },
        { ...summary, id: APPROVED_ID, number: 13, displayNumber: 'COT-0013', status: 'APPROVED' },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    });
    const probabilities = vi.spyOn(aiService, 'getProbabilities').mockResolvedValue([probability]);
    renderAt('/quotes');

    expect((await screen.findAllByRole('button', { name: /35 %/ })).length).toBeGreaterThan(0);
    expect(probabilities).toHaveBeenCalledTimes(1);
    expect(probabilities.mock.calls[0]?.[0]).toEqual([QUOTE_ID]);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('shows the badge only on a sent quote and the assistant only with its action', async () => {
    vi.spyOn(quotesService, 'history').mockResolvedValue([]);
    const probabilities = vi.spyOn(aiService, 'getProbabilities').mockResolvedValue([probability]);
    const get = vi.spyOn(quotesService, 'get').mockResolvedValue(quoteFixture());
    renderAt(`/quotes/${QUOTE_ID}`);

    expect((await screen.findAllByRole('button', { name: /35 %/ })).length).toBeGreaterThan(0);
    expect(screen.queryByText(es.ai.assistant.title)).toBeNull();
    cleanup();

    get.mockResolvedValue(
      quoteFixture({ allowedActions: ['edit', 'approve', 'followUpAssistant'] }),
    );
    renderAt(`/quotes/${QUOTE_ID}`);
    expect(await screen.findByText(es.ai.assistant.title)).toBeTruthy();
    cleanup();

    probabilities.mockClear();
    get.mockResolvedValue(quoteFixture({ status: 'APPROVED', allowedActions: ['duplicate'] }));
    renderAt(`/quotes/${QUOTE_ID}`);
    expect(await screen.findByRole('button', { name: es.quotes.actions.duplicate })).toBeTruthy();
    expect(probabilities).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /35 %/ })).toBeNull();
    expect(screen.queryByText(es.ai.assistant.title)).toBeNull();
  });
});

describe('row actions of the list (D6: no state changes)', () => {
  const APPROVED_ID = '8e9f0a1b-2c3d-4e5f-8a6b-7c8d9e0f1a2b';
  const NEW_ID = '9f0a1b2c-3d4e-4f5a-8b6c-7d8e9f0a1b2c';

  beforeEach(() => {
    const { id, number, displayNumber, customer, owner, total, expiresAt, updatedAt } =
      quoteFixture();
    const summary = { id, number, displayNumber, customer, owner, total, expiresAt, updatedAt };
    vi.spyOn(quotesService, 'list').mockResolvedValue({
      items: [
        { ...summary, status: 'DRAFT' },
        {
          ...summary,
          id: APPROVED_ID,
          number: 13,
          displayNumber: 'COT-0013',
          status: 'APPROVED',
          customer: { ...customer, name: 'Beta SAS' },
        },
      ],
      total: 2,
      page: 1,
      pageSize: 20,
    });
    vi.spyOn(aiService, 'getProbabilities').mockResolvedValue([]);
    useQuoteFiltersStore.getState().reset();
  });

  const table = async () => within(await screen.findByRole('table'));
  const row = async (text: string) => {
    const cell = (await table()).getByText(text);
    return cell.closest('tr') as HTMLElement;
  };

  it('opens the detail when clicking anywhere on the row', async () => {
    const router = renderAt('/quotes');
    fireEvent.click((await table()).getByText('Beta SAS'));
    expect(router.state.location.pathname).toBe(`/quotes/${APPROVED_ID}`);
  });

  it('shows "Ver detalle" on every row and "Editar" only on editable statuses', async () => {
    renderAt('/quotes');
    const draft = within(await row('Acme SAS'));
    const approved = within(await row('Beta SAS'));
    expect(draft.getByRole('link', { name: 'Ver detalle' }).getAttribute('href')).toBe(
      `/quotes/${QUOTE_ID}`,
    );
    expect(draft.getByRole('link', { name: 'Editar' }).getAttribute('href')).toBe(
      `/quotes/${QUOTE_ID}/edit`,
    );
    expect(approved.getByRole('link', { name: 'Ver detalle' }).getAttribute('href')).toBe(
      `/quotes/${APPROVED_ID}`,
    );
    expect(approved.queryByRole('link', { name: 'Editar' })).toBeNull();
  });

  it('keeps state changes out of the menu: PDF always, Duplicar only on final quotes', async () => {
    const router = renderAt('/quotes');
    fireEvent.click(
      within(await row('Acme SAS')).getByRole('button', { name: 'Más acciones de COT-0012' }),
    );
    let menu = screen.getByRole('menu');
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Descargar PDF']);
    expect(router.state.location.pathname).toBe('/quotes');

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(
      within(await row('Beta SAS')).getByRole('button', { name: 'Más acciones de COT-0013' }),
    );
    menu = screen.getByRole('menu');
    const labels = within(menu)
      .getAllByRole('menuitem')
      .map((item) => item.textContent);
    expect(labels).toEqual(['Descargar PDF', 'Duplicar']);
    for (const state of ['Marcar como aprobada', 'Marcar como rechazada', 'Anular', 'Reactivar']) {
      expect(labels).not.toContain(state);
    }
  });

  it('downloads the PDF from the menu without leaving the list', async () => {
    const download = vi.spyOn(documentsService, 'downloadPdf').mockResolvedValue();
    const router = renderAt('/quotes');
    fireEvent.click(
      within(await row('Acme SAS')).getByRole('button', { name: 'Más acciones de COT-0012' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Descargar PDF' }));
    await waitFor(() => expect(download).toHaveBeenCalledWith(QUOTE_ID, 'COT-0012', 'view'));
    expect(router.state.location.pathname).toBe('/quotes');
  });

  it('duplicates a final quote after confirmation and opens the new draft', async () => {
    const duplicate = vi.spyOn(quotesService, 'duplicate').mockResolvedValue({
      quote: quoteFixture({ id: NEW_ID, displayNumber: 'COT-0014', status: 'DRAFT' }),
      omittedProductIds: [],
      discountReset: false,
    });
    vi.spyOn(quotesService, 'get').mockResolvedValue(
      quoteFixture({ id: NEW_ID, displayNumber: 'COT-0014', status: 'DRAFT' }),
    );
    const router = renderAt('/quotes');
    fireEvent.click(
      within(await row('Beta SAS')).getByRole('button', { name: 'Más acciones de COT-0013' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Duplicar' }));
    const dialog = screen.getByRole('dialog', { name: '¿Duplicar COT-0013?' });
    expect(router.state.location.pathname).toBe('/quotes');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Duplicar' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/quotes/${NEW_ID}/edit`));
    expect(duplicate).toHaveBeenCalledWith(APPROVED_ID);
  });
});
