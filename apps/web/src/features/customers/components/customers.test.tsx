import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { CustomerDto, QuoteSummaryDto } from '@zentia/shared';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../core/errors';
import { PrivateLayout } from '../../../core/layout';
import es from '../../../lang/es.json';
import { signIn } from '../../../test/session-fixture';
import { interactionsService } from '../../follow-up';
import { quotesService } from '../../quotes';
import { customersService } from '../services/customers.service';
import { useCustomersFiltersStore } from '../store/customers-filters.store';
import { CustomerDetailPage } from './customer-detail-page';
import { CustomersPage } from './customers-page';

const existing: CustomerDto = {
  id: '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  name: 'Acme SAS',
  documentId: '9001234567',
  phone: '573001234567',
  email: null,
  isActive: true,
  createdBy: { id: '7b0f5c4e-0d5a-4a43-9d8a-6b8f2f3b1c11', name: 'Ana Gómez' },
  createdAt: '2026-11-03T15:00:00.000Z',
  updatedAt: '2026-11-03T15:00:00.000Z',
};

function quoteFixture(index: number): QuoteSummaryDto {
  return {
    id: `0b1c2d3e-4f5a-4b6c-8d7e-${String(index).padStart(12, '0')}`,
    number: index,
    displayNumber: `COT-${String(index).padStart(4, '0')}`,
    status: index % 2 === 0 ? 'APPROVED' : 'SENT',
    customer: { id: existing.id, name: existing.name },
    owner: { id: existing.createdBy.id, name: existing.createdBy.name },
    total: '1190000',
    expiresAt: null,
    updatedAt: '2026-11-03T15:00:00.000Z',
  };
}

function renderApp(initialEntry = '/customers') {
  const router = createMemoryRouter(
    [
      {
        element: <PrivateLayout navItems={[]} />,
        children: [
          { path: '/customers', element: <CustomersPage /> },
          { path: '/customers/:id', element: <CustomerDetailPage /> },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function field(dialog: HTMLElement, label: string) {
  return within(dialog).getByLabelText(new RegExp(`^${label.replace(/[()]/g, '\\$&')}`));
}

async function openForm() {
  fireEvent.click(await screen.findByRole('button', { name: es.customers.new }));
  return screen.findByRole('dialog');
}

beforeEach(() => {
  signIn('SELLER');
  vi.spyOn(interactionsService, 'list').mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });
  vi.spyOn(quotesService, 'list').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 5 });
});

afterEach(() => {
  vi.restoreAllMocks();
  useCustomersFiltersStore.getState().reset();
});

describe('Customer form', () => {
  it('previews the normalized document and the WhatsApp phone', async () => {
    vi.spyOn(customersService, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    renderApp();
    const dialog = await openForm();

    fireEvent.change(field(dialog, es.customers.fields.documentId), {
      target: { value: '900.123.456-7' },
    });
    fireEvent.change(field(dialog, es.customers.fields.phone), {
      target: { value: '300 123 4567' },
    });

    expect(within(dialog).getByText('Se guardará como 9001234567')).toBeTruthy();
    expect(within(dialog).getByText('Se usará como +57 300 123 4567')).toBeTruthy();
  });

  it('warns about an existing document and opens it', async () => {
    vi.spyOn(customersService, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    const matches = vi
      .spyOn(customersService, 'documentMatches')
      .mockResolvedValue({ items: [existing] });
    vi.spyOn(customersService, 'get').mockResolvedValue(existing);
    const router = renderApp();
    const dialog = await openForm();

    const input = field(dialog, es.customers.fields.documentId);
    fireEvent.change(input, { target: { value: '900 123 456 7' } });
    fireEvent.blur(input);

    expect(
      await within(dialog).findByText('Ya existe un cliente con este documento: Acme SAS.'),
    ).toBeTruthy();
    expect(matches).toHaveBeenLastCalledWith('9001234567');
    fireEvent.click(within(dialog).getByRole('button', { name: es.customers.openExisting }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/customers/${existing.id}`));
  });

  it('warns when the existing document is a prefix of the typed one', async () => {
    vi.spyOn(customersService, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    const matches = vi
      .spyOn(customersService, 'documentMatches')
      .mockResolvedValue({ items: [{ ...existing, documentId: '900123456' }] });
    renderApp();
    const dialog = await openForm();

    const input = field(dialog, es.customers.fields.documentId);
    fireEvent.change(input, { target: { value: '900.123.456-7' } });
    fireEvent.blur(input);

    expect(
      await within(dialog).findByText('Ya existe un cliente con este documento: Acme SAS.'),
    ).toBeTruthy();
    expect(matches).toHaveBeenCalledWith('9001234567');

    matches.mockClear();
    fireEvent.change(input, { target: { value: '9001' } });
    fireEvent.blur(input);
    await waitFor(() =>
      expect(
        within(dialog).queryByText('Ya existe un cliente con este documento: Acme SAS.'),
      ).toBeNull(),
    );
    expect(matches).not.toHaveBeenCalled();
  });

  it('shows the server duplicate error on the document field', async () => {
    vi.spyOn(customersService, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    vi.spyOn(customersService, 'documentMatches').mockResolvedValue({ items: [] });
    vi.spyOn(customersService, 'create').mockRejectedValue(
      new ApiError('CUSTOMER_DOCUMENT_TAKEN', 409),
    );
    renderApp();
    const dialog = await openForm();

    fireEvent.change(field(dialog, es.customers.fields.name), { target: { value: 'Acme' } });
    fireEvent.change(field(dialog, es.customers.fields.documentId), { target: { value: '12345' } });
    fireEvent.change(field(dialog, es.customers.fields.email), { target: { value: 'a@b.co' } });
    fireEvent.click(within(dialog).getByRole('button', { name: es.customers.form.create }));

    await waitFor(() =>
      expect(field(dialog, es.customers.fields.documentId).getAttribute('aria-invalid')).toBe(
        'true',
      ),
    );
    expect(within(dialog).getByText(es.errors.CUSTOMER_DOCUMENT_TAKEN)).toBeTruthy();
  });

  it('accepts an email with surrounding spaces', async () => {
    vi.spyOn(customersService, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    vi.spyOn(customersService, 'documentMatches').mockResolvedValue({ items: [] });
    vi.spyOn(customersService, 'get').mockResolvedValue(existing);
    const create = vi.spyOn(customersService, 'create').mockResolvedValue(existing);
    renderApp();
    const dialog = await openForm();

    fireEvent.change(field(dialog, es.customers.fields.name), { target: { value: 'Ana' } });
    fireEvent.change(field(dialog, es.customers.fields.documentId), { target: { value: '12345' } });
    fireEvent.change(field(dialog, es.customers.fields.email), {
      target: { value: 'Ana@Mail.com ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: es.customers.form.create }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        name: 'Ana',
        documentId: '12345',
        phone: null,
        email: 'ana@mail.com',
      }),
    );
  });

  it('requires a phone or an email before calling the API', async () => {
    vi.spyOn(customersService, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    const create = vi.spyOn(customersService, 'create');
    renderApp();
    const dialog = await openForm();

    fireEvent.change(field(dialog, es.customers.fields.name), { target: { value: 'Nuevo' } });
    fireEvent.change(field(dialog, es.customers.fields.documentId), { target: { value: '12345' } });
    fireEvent.click(within(dialog).getByRole('button', { name: es.customers.form.create }));

    await waitFor(() =>
      expect(field(dialog, es.customers.fields.phone).getAttribute('aria-invalid')).toBe('true'),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('creates the customer and navigates to its detail', async () => {
    vi.spyOn(customersService, 'list').mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    const create = vi.spyOn(customersService, 'create').mockResolvedValue(existing);
    vi.spyOn(customersService, 'get').mockResolvedValue(existing);
    const router = renderApp();
    const dialog = await openForm();

    fireEvent.change(field(dialog, es.customers.fields.name), { target: { value: 'Acme SAS' } });
    fireEvent.change(field(dialog, es.customers.fields.documentId), {
      target: { value: '900.123.456-7' },
    });
    fireEvent.change(field(dialog, es.customers.fields.email), {
      target: { value: 'compras@acme.co' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: es.customers.form.create }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        name: 'Acme SAS',
        documentId: '9001234567',
        phone: null,
        email: 'compras@acme.co',
      }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe(`/customers/${existing.id}`));
    expect(await screen.findByText('Ana Gómez')).toBeTruthy();
    expect(screen.getByText('+57 300 123 4567')).toBeTruthy();
  });
});

describe('Customer detail', () => {
  it('asks for confirmation before deactivating', async () => {
    vi.spyOn(customersService, 'get').mockResolvedValue(existing);
    const update = vi
      .spyOn(customersService, 'update')
      .mockResolvedValue({ ...existing, isActive: false });
    renderApp(`/customers/${existing.id}`);

    fireEvent.click(await screen.findByRole('button', { name: es.common.actions.deactivate }));
    const dialog = await screen.findByRole('dialog');
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: es.common.actions.deactivate }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(existing.id, { isActive: false }));
    expect(await screen.findByRole('button', { name: es.common.actions.activate })).toBeTruthy();
  });

  it('lists the customer quotes and loads more', async () => {
    vi.spyOn(customersService, 'get').mockResolvedValue(existing);
    const list = vi
      .spyOn(quotesService, 'list')
      .mockResolvedValueOnce({
        items: [1, 2, 3, 4, 5].map(quoteFixture),
        total: 6,
        page: 1,
        pageSize: 5,
      })
      .mockResolvedValueOnce({ items: [quoteFixture(6)], total: 6, page: 2, pageSize: 5 });
    renderApp(`/customers/${existing.id}`);

    const section = await screen.findByRole('list', { name: es.customers.quotes.title });
    expect(within(section).getAllByRole('listitem')).toHaveLength(5);
    expect(within(section).getByRole('link', { name: 'COT-0001' }).getAttribute('href')).toBe(
      `/quotes/${quoteFixture(1).id}`,
    );
    expect(within(section).getAllByText(es.enums.QuoteStatus.APPROVED)).toHaveLength(2);
    expect(within(section).getAllByText(/1\.190\.000/)).toHaveLength(5);
    expect(list).toHaveBeenCalledWith({
      statuses: [],
      customerId: existing.id,
      page: 1,
      pageSize: 5,
    });

    fireEvent.click(screen.getByRole('button', { name: es.customers.quotes.loadMore }));
    expect(await within(section).findByRole('link', { name: 'COT-0006' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: es.customers.quotes.loadMore })).toBeNull();
  });

  it('shows an empty state when the customer has no quotes', async () => {
    vi.spyOn(customersService, 'get').mockResolvedValue(existing);
    renderApp(`/customers/${existing.id}`);

    expect(await screen.findByText(es.customers.quotes.empty)).toBeTruthy();
    expect(screen.getByText(es.customers.quotes.ownOnly)).toBeTruthy();
  });

  it('retries after an error loading the quotes', async () => {
    vi.spyOn(customersService, 'get').mockResolvedValue(existing);
    const list = vi
      .spyOn(quotesService, 'list')
      .mockRejectedValueOnce(new ApiError('INTERNAL_ERROR', 500))
      .mockResolvedValueOnce({ items: [quoteFixture(1)], total: 1, page: 1, pageSize: 5 });
    renderApp(`/customers/${existing.id}`);

    fireEvent.click(await screen.findByRole('button', { name: es.common.retry }));
    expect(await screen.findByRole('link', { name: 'COT-0001' })).toBeTruthy();
    expect(list).toHaveBeenCalledTimes(2);
  });
});
