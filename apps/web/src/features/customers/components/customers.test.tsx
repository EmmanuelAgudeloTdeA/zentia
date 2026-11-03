import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { CustomerDto } from '@zentia/shared';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivateLayout } from '../../../core/layout';
import es from '../../../lang/es.json';
import { signIn } from '../../../test/session-fixture';
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

function renderApp() {
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
    { initialEntries: ['/customers'] },
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
    const list = vi
      .spyOn(customersService, 'list')
      .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    vi.spyOn(customersService, 'get').mockResolvedValue(existing);
    const router = renderApp();
    const dialog = await openForm();
    list.mockResolvedValue({ items: [existing], total: 1, page: 1, pageSize: 5 });

    const input = field(dialog, es.customers.fields.documentId);
    fireEvent.change(input, { target: { value: '900 123 456 7' } });
    fireEvent.blur(input);

    expect(
      await within(dialog).findByText('Ya existe un cliente con este documento: Acme SAS.'),
    ).toBeTruthy();
    expect(list).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: '9001234567', status: 'all' }),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: es.customers.openExisting }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/customers/${existing.id}`));
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
