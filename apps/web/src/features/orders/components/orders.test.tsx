import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { OrderDto } from '@zentia/shared';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivateLayout } from '../../../core/layout';
import es from '../../../lang/es.json';
import { signIn } from '../../../test/session-fixture';
import { ordersService } from '../services/orders.service';
import { OrderDetailPage } from './order-detail-page';
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
});

afterEach(() => {
  vi.restoreAllMocks();
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
});
