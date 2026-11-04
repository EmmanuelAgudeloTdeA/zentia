import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { CompanySettingsDto, ProductDto } from '@zentia/shared';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrivateLayout } from '../../../core/layout';
import es from '../../../lang/es.json';
import { signIn } from '../../../test/session-fixture';
import { companyService } from '../../company-settings';
import { productsService } from '../services/products.service';
import { useProductsFiltersStore } from '../store/products-filters.store';
import { ProductsPage } from './products-page';

const product: ProductDto = {
  id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
  name: 'Portátil',
  category: 'Tecnología',
  price: '1550000',
  vatRate: 'GENERAL_19',
  isActive: true,
  updatedAt: '2026-11-03T15:00:00.000Z',
};

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        element: <PrivateLayout navItems={[]} />,
        children: [{ path: '/products', element: <ProductsPage /> }],
      },
    ],
    { initialEntries: ['/products'] },
  );
  render(<RouterProvider router={router} />);
}

function mockList(items: ProductDto[]) {
  return vi
    .spyOn(productsService, 'list')
    .mockResolvedValue({ items, total: items.length, page: 1, pageSize: 20 });
}

afterEach(() => {
  vi.restoreAllMocks();
  useProductsFiltersStore.getState().reset();
});

describe('ProductsPage', () => {
  it('is read-only for a SELLER and formats price and VAT', async () => {
    signIn('SELLER');
    mockList([product]);
    renderPage();

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Portátil')).toBeTruthy();
    expect(within(table).getByText(/1\.550\.000/)).toBeTruthy();
    expect(within(table).getByText(es.enums.VatRate.GENERAL_19)).toBeTruthy();
    expect(screen.queryByRole('button', { name: es.products.new })).toBeNull();
    expect(screen.queryByRole('button', { name: es.common.statusFilter.inactive })).toBeNull();
    expect(within(table).queryByText(es.common.status.active)).toBeNull();
  });

  it('preselects the company VAT rate and sends the price as whole pesos', async () => {
    signIn('ADMIN');
    mockList([]);
    vi.spyOn(companyService, 'getSettings').mockResolvedValue({
      defaultVatRate: 'REDUCED_5',
    } as CompanySettingsDto);
    vi.spyOn(productsService, 'categories').mockResolvedValue([]);
    const create = vi.spyOn(productsService, 'create').mockResolvedValue(product);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: es.products.new }));
    const dialog = await screen.findByRole('dialog');
    const vat = within(dialog).getByLabelText(
      new RegExp(`^${es.products.fields.vatRate}`),
    ) as HTMLSelectElement;
    await waitFor(() => expect(vat.value).toBe('REDUCED_5'));

    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${es.products.fields.name}`)), {
      target: { value: 'Mouse' },
    });
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${es.products.fields.category}`)), {
      target: { value: 'Accesorios' },
    });
    const price = within(dialog).getByLabelText(new RegExp(`^${es.products.fields.price}`));
    fireEvent.focus(price);
    fireEvent.change(price, { target: { value: '0045.000,50' } });
    fireEvent.blur(price);
    expect((price as HTMLInputElement).value).toBe('4.500.050');

    fireEvent.click(within(dialog).getByRole('button', { name: es.products.form.create }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        name: 'Mouse',
        category: 'Accesorios',
        price: '4500050',
        vatRate: 'REDUCED_5',
      }),
    );
  });

  it('suggests categories and offers to create a new one', async () => {
    signIn('ADMIN');
    mockList([]);
    vi.spyOn(companyService, 'getSettings').mockRejectedValue(new Error('offline'));
    vi.spyOn(productsService, 'categories').mockResolvedValue(['Tecnología']);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: es.products.new }));
    const dialog = await screen.findByRole('dialog');
    const combobox = within(dialog).getByLabelText(new RegExp(`^${es.products.fields.category}`));
    fireEvent.change(combobox, { target: { value: 'tec' } });

    expect(await within(dialog).findByRole('option', { name: 'Tecnología' })).toBeTruthy();
    expect(within(dialog).getByRole('option', { name: 'Crear categoría «tec»' })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('option', { name: 'Tecnología' }));
    expect((combobox as HTMLInputElement).value).toBe('Tecnología');
  });

  it('hides every status chip from a SELLER', async () => {
    signIn('SELLER');
    mockList([product]);
    renderPage();

    await screen.findByRole('table');
    for (const status of ['active', 'inactive', 'all'] as const) {
      expect(screen.queryByRole('button', { name: es.common.statusFilter[status] })).toBeNull();
    }
    expect(screen.queryByRole('group', { name: es.common.statusFilter.label })).toBeNull();
  });

  it('warns that edits do not change existing quotes', async () => {
    signIn('ADMIN');
    mockList([product]);
    vi.spyOn(companyService, 'getSettings').mockRejectedValue(new Error('offline'));
    vi.spyOn(productsService, 'categories').mockResolvedValue([]);
    renderPage();

    const table = await screen.findByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: es.common.actions.edit }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(es.products.snapshotNotice)).toBeTruthy();
  });

  it('asks before deactivating and keeps the row with the "all" filter', async () => {
    signIn('ADMIN');
    useProductsFiltersStore.getState().setStatus('all');
    mockList([product]);
    const update = vi
      .spyOn(productsService, 'update')
      .mockResolvedValue({ ...product, isActive: false });
    renderPage();

    const table = await screen.findByRole('table');
    fireEvent.click(within(table).getByRole('button', { name: es.common.actions.more }));
    fireEvent.click(await screen.findByRole('menuitem', { name: es.common.actions.deactivate }));
    const dialog = await screen.findByRole('dialog');
    expect(update).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: es.common.actions.deactivate }));

    await waitFor(() => expect(update).toHaveBeenCalledWith(product.id, { isActive: false }));
    expect(await within(table).findByText(es.common.status.inactive)).toBeTruthy();
  });

  it('refreshes the list when a deactivated product leaves the "active" filter', async () => {
    signIn('ADMIN');
    const list = mockList([product]);
    vi.spyOn(productsService, 'update').mockResolvedValue({ ...product, isActive: false });
    renderPage();

    const table = await screen.findByRole('table');
    list.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    fireEvent.click(within(table).getByRole('button', { name: es.common.actions.more }));
    fireEvent.click(await screen.findByRole('menuitem', { name: es.common.actions.deactivate }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: es.common.actions.deactivate }));

    await waitFor(() => expect(screen.queryByText('Portátil')).toBeNull());
    expect(list).toHaveBeenCalledTimes(2);
  });
});
