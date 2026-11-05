import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { OrderDto, OrderListDto } from '@zentia/shared';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../core/errors';
import { PrivateLayout } from '../../../core/layout';
import es from '../../../lang/es.json';
import { useToastStore } from '../../../shared/ui';
import { signIn } from '../../../test/session-fixture';
import { ordersService } from '../services/orders.service';
import { useOrdersFiltersStore } from '../store/orders-filters.store';
import { OrderDetailPage } from './order-detail-page';
import { OrdersListPage } from './orders-list-page';
import { QuoteOrderAction } from './quote-order-action';

const ORDER_ID = '8f9a0b1c-2d3e-4f5a-8b6c-7d8e9f0a1b2c';
const QUOTE_ID = '2b3c4d5e-6f70-4a81-9b2c-3d4e5f6a7b8c';

function orderFixture(overrides: Partial<OrderDto> = {}): OrderDto {
  return {
    id: ORDER_ID,
    displayNumber: 'PED-0012',
    status: 'PENDING',
    quote: { id: QUOTE_ID, displayNumber: 'COT-0012' },
    customer: { id: '3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d', name: 'Acme SAS' },
    owner: { id: '7b0f5c4e-0d5a-4a43-9d8a-6b8f2f3b1c11', name: 'Ana Gómez' },
    createdBy: { id: '7b0f5c4e-0d5a-4a43-9d8a-6b8f2f3b1c11', name: 'Ana Gómez' },
    total: '5375000',
    createdAt: '2026-11-03T15:00:00.000Z',
    items: [],
    discountPct: '10',
    discountAmount: '500000',
    subtotal: '5000000',
    linesVat: '855000',
    shippingAmount: '20000',
    shippingVat: '0',
    inProgressAt: null,
    deliveredAt: null,
    cancelledAt: null,
    cancelReason: null,
    allowedActions: ['startProgress', 'cancel'],
    updatedAt: '2026-11-03T15:00:00.000Z',
    ...overrides,
  };
}

function renderAt(path: string, element = <OrderDetailPage />) {
  const router = createMemoryRouter(
    [
      {
        element: <PrivateLayout navItems={[]} />,
        children: [
          { path: '/orders/:id', element: <OrderDetailPage /> },
          { path: '/quotes/:id', element },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  signIn('SELLER');
  useOrdersFiltersStore.getState().reset();
  useToastStore.setState({ toasts: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('OrdersListPage', () => {
  function listResponse(overrides: Partial<OrderListDto> = {}): Response {
    const body: OrderListDto = {
      items: [orderFixture()],
      total: 45,
      page: 1,
      pageSize: 20,
      ...overrides,
    };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('sends the status chips as CSV, the search and the page to the API', async () => {
    const fetchMock = vi.fn((input: string) => {
      const page = new URL(input, 'http://localhost').searchParams.get('page') ?? '1';
      return Promise.resolve(listResponse({ page: Number(page) }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const lastQuery = () =>
      new URL(String(fetchMock.mock.calls.at(-1)?.[0]), 'http://localhost').searchParams;
    render(
      <RouterProvider
        router={createMemoryRouter([{ path: '/orders', element: <OrdersListPage /> }], {
          initialEntries: ['/orders'],
        })}
      />,
    );

    expect((await screen.findAllByText('PED-0012')).length).toBeGreaterThan(0);
    await waitFor(() => expect(lastQuery().get('page')).toBe('1'));
    expect(lastQuery().has('status')).toBe(false);

    const chips = screen.getByRole('group', { name: es.orders.filters.status });
    fireEvent.click(within(chips).getByRole('button', { name: es.enums.OrderStatus.PENDING }));
    fireEvent.click(within(chips).getByRole('button', { name: es.enums.OrderStatus.DELIVERED }));
    await waitFor(() => expect(lastQuery().get('status')).toBe('PENDING,DELIVERED'));

    fireEvent.change(screen.getByLabelText(es.orders.filters.search), {
      target: { value: 'Acme' },
    });
    await waitFor(() => expect(lastQuery().get('q')).toBe('Acme'));
    expect(lastQuery().get('status')).toBe('PENDING,DELIVERED');

    fireEvent.click(await screen.findByRole('button', { name: es.common.nextPage }));
    await waitFor(() => expect(lastQuery().get('page')).toBe('2'));
    expect(lastQuery().get('pageSize')).toBe('20');
  });
  it('opens the order from anywhere on the row and offers an explicit "Ver detalle"', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(listResponse()));
    const router = createMemoryRouter(
      [
        { path: '/orders', element: <OrdersListPage /> },
        { path: '/orders/:id', element: <p>detalle</p> },
      ],
      { initialEntries: ['/orders'] },
    );
    render(<RouterProvider router={router} />);
    const table = within(await screen.findByRole('table'));
    const row = within(table.getByText('Acme SAS').closest('tr') as HTMLElement);
    expect(row.getByRole('link', { name: es.common.actions.viewDetail }).getAttribute('href')).toBe(
      `/orders/${ORDER_ID}`,
    );
    fireEvent.click(table.getByText('Acme SAS'));
    expect(router.state.location.pathname).toBe(`/orders/${ORDER_ID}`);
  });
});

describe('OrderDetailPage', () => {
  it('shows the actions allowed and starts processing', async () => {
    vi.spyOn(ordersService, 'get').mockResolvedValue(orderFixture());
    const change = vi
      .spyOn(ordersService, 'changeStatus')
      .mockResolvedValue(
        orderFixture({ status: 'IN_PROGRESS', allowedActions: ['deliver', 'cancel'] }),
      );
    renderAt(`/orders/${ORDER_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: es.orders.actions.startProgress }));
    await waitFor(() =>
      expect(change).toHaveBeenCalledWith(ORDER_ID, {
        to: 'IN_PROGRESS',
        updatedAt: '2026-11-03T15:00:00.000Z',
      }),
    );
    expect(await screen.findByRole('button', { name: es.orders.actions.deliver })).toBeTruthy();
    expect(screen.getByText(es.orders.noInventoryNotice)).toBeTruthy();
  });

  it('shows a conflict once, inline, with a reload action', async () => {
    const get = vi.spyOn(ordersService, 'get').mockResolvedValue(orderFixture());
    vi.spyOn(ordersService, 'changeStatus').mockRejectedValue(new ApiError('ORDER_CONFLICT', 409));
    renderAt(`/orders/${ORDER_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: es.orders.actions.startProgress }));
    expect(await screen.findByText(es.orders.conflict)).toBeTruthy();
    expect(useToastStore.getState().toasts).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: es.orders.reload }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it('shows an action error only once', async () => {
    vi.spyOn(ordersService, 'get').mockResolvedValue(orderFixture());
    vi.spyOn(ordersService, 'changeStatus').mockRejectedValue(
      new ApiError('ORDER_INVALID_TRANSITION', 409),
    );
    renderAt(`/orders/${ORDER_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: es.orders.actions.startProgress }));
    expect(await screen.findAllByText(es.errors.ORDER_INVALID_TRANSITION)).toHaveLength(1);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('asks for confirmation before marking as delivered', async () => {
    vi.spyOn(ordersService, 'get').mockResolvedValue(
      orderFixture({ status: 'IN_PROGRESS', allowedActions: ['deliver', 'cancel'] }),
    );
    const change = vi
      .spyOn(ordersService, 'changeStatus')
      .mockResolvedValue(orderFixture({ status: 'DELIVERED', allowedActions: [] }));
    renderAt(`/orders/${ORDER_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: es.orders.actions.deliver }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('¿Marcar PED-0012 como entregado?')).toBeTruthy();
    expect(change).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: es.orders.actions.deliver }));

    await waitFor(() =>
      expect(change).toHaveBeenCalledWith(ORDER_ID, {
        to: 'DELIVERED',
        updatedAt: '2026-11-03T15:00:00.000Z',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('clears the action error when the cancel dialog is closed', async () => {
    vi.spyOn(ordersService, 'get').mockResolvedValue(orderFixture());
    vi.spyOn(ordersService, 'changeStatus').mockRejectedValue(
      new ApiError('ORDER_INVALID_TRANSITION', 409),
    );
    renderAt(`/orders/${ORDER_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: es.orders.actions.cancel }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: es.orders.actions.cancel }));
    expect(await within(dialog).findByText(es.errors.ORDER_INVALID_TRANSITION)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: es.orders.cancel.back }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText(es.errors.ORDER_INVALID_TRANSITION)).toBeNull();
  });

  it('cancels with an optional reason after confirmation', async () => {
    vi.spyOn(ordersService, 'get').mockResolvedValue(orderFixture());
    const change = vi
      .spyOn(ordersService, 'changeStatus')
      .mockResolvedValue(
        orderFixture({ status: 'CANCELLED', allowedActions: [], cancelReason: 'Desistió' }),
      );
    renderAt(`/orders/${ORDER_ID}`);

    fireEvent.click(await screen.findByRole('button', { name: es.orders.actions.cancel }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(
      within(dialog).getByLabelText(
        new RegExp(`^${es.orders.cancel.reason.replace(/[()]/g, '\\$&')}`),
      ),
      {
        target: { value: 'Desistió' },
      },
    );
    fireEvent.click(within(dialog).getByRole('button', { name: es.orders.actions.cancel }));

    await waitFor(() =>
      expect(change).toHaveBeenCalledWith(ORDER_ID, {
        to: 'CANCELLED',
        reason: 'Desistió',
        updatedAt: '2026-11-03T15:00:00.000Z',
      }),
    );
    expect(await screen.findByText('Desistió')).toBeTruthy();
    expect(screen.queryByRole('button', { name: es.orders.actions.cancel })).toBeNull();
  });
});

describe('QuoteOrderAction', () => {
  it('converts an approved quote and opens the order', async () => {
    const convert = vi.spyOn(ordersService, 'convert').mockResolvedValue(orderFixture());
    const router = renderAt(
      `/quotes/${QUOTE_ID}`,
      <QuoteOrderAction
        quoteId={QUOTE_ID}
        quoteNumber="COT-0012"
        allowedActions={['convertToOrder']}
        onReload={vi.fn()}
      />,
    );
    vi.spyOn(ordersService, 'get').mockResolvedValue(orderFixture());

    fireEvent.click(await screen.findByRole('button', { name: es.orders.actions.convert }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/PED-0012/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: es.orders.actions.convert }));

    await waitFor(() => expect(convert).toHaveBeenCalledWith(QUOTE_ID));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/orders/${ORDER_ID}`));
  });

  it('links to the existing order instead of converting again', async () => {
    vi.spyOn(ordersService, 'getByQuote').mockResolvedValue(orderFixture({ status: 'CANCELLED' }));
    renderAt(
      `/quotes/${QUOTE_ID}`,
      <QuoteOrderAction
        quoteId={QUOTE_ID}
        quoteNumber="COT-0012"
        allowedActions={['viewOrder', 'duplicate']}
        onReload={vi.fn()}
      />,
    );
    const link = await screen.findByRole('link', { name: /Ver pedido PED-0012/ });
    expect(link.getAttribute('href')).toBe(`/orders/${ORDER_ID}`);
    expect(screen.queryByRole('button', { name: es.orders.actions.convert })).toBeNull();
  });

  it('shows the conversion error and reloads the quote on close', async () => {
    vi.spyOn(ordersService, 'convert').mockRejectedValue(new ApiError('ORDER_ALREADY_EXISTS', 409));
    const onReload = vi.fn();
    renderAt(
      `/quotes/${QUOTE_ID}`,
      <QuoteOrderAction
        quoteId={QUOTE_ID}
        quoteNumber="COT-0012"
        allowedActions={['convertToOrder']}
        onReload={onReload}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: es.orders.actions.convert }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: es.orders.actions.convert }));
    expect(await within(dialog).findByText(es.errors.ORDER_ALREADY_EXISTS)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: es.common.cancel }));
    expect(onReload).toHaveBeenCalled();
  });

  it('falls back to the orders list when the order cannot be loaded', async () => {
    vi.spyOn(ordersService, 'getByQuote').mockRejectedValue(new ApiError('NETWORK_ERROR', 0));
    renderAt(
      `/quotes/${QUOTE_ID}`,
      <QuoteOrderAction
        quoteId={QUOTE_ID}
        quoteNumber="COT-0012"
        allowedActions={['viewOrder']}
        onReload={vi.fn()}
      />,
    );

    const link = await screen.findByRole('link', { name: es.orders.backToList });
    expect(link.getAttribute('href')).toBe('/orders');
  });
});
