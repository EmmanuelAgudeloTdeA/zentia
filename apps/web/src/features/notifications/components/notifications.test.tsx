import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { NotificationDto } from '@zentia/shared';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivateLayout } from '../../../core/layout';
import { useNotificationsStore } from '../../../core/notifications';
import es from '../../../lang/es.json';
import { signIn } from '../../../test/session-fixture';
import { notificationsService } from '../services/notifications.service';
import { NotificationBell } from './notification-bell';
import { NotificationsPage } from './notifications-page';

const QUOTE_ID = '2b3c4d5e-6f70-4a81-9b2c-3d4e5f6a7b8c';

function notification(overrides: Partial<NotificationDto> = {}): NotificationDto {
  return {
    id: '6d7e8f90-a1b2-4c3d-8e4f-5a6b7c8d9e0f',
    type: 'QUOTE_EXPIRING',
    params: {
      quoteId: QUOTE_ID,
      quoteNumber: 'COT-0012',
      customerName: 'Acme SAS',
      expiresAt: '2026-11-06',
    },
    referenceDate: '2026-11-06',
    readAt: null,
    createdAt: '2026-11-03T12:00:00.000Z',
    quote: { id: QUOTE_ID, displayNumber: 'COT-0012', status: 'SENT' },
    ...overrides,
  };
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <PrivateLayout navItems={[]} headerEnd={<NotificationBell />} />,
        children: [
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/quotes/:id', element: <p>detalle</p> },
          { path: '/', element: <p>inicio</p> },
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
  useNotificationsStore.getState().setUnreadCount(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('NotificationBell', () => {
  it('shows the unread count, opens a notification and lowers the count', async () => {
    vi.spyOn(notificationsService, 'unreadCount').mockResolvedValue({ count: 3 });
    vi.spyOn(notificationsService, 'list').mockResolvedValue({
      items: [notification()],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    const markRead = vi.spyOn(notificationsService, 'markRead').mockResolvedValue(undefined);
    const router = renderAt('/');

    expect((await screen.findByTestId('unread-count')).textContent).toBe('3');
    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones (3 sin leer)' }));
    fireEvent.click(await screen.findByText('COT-0012 de Acme SAS vence el 06/11/2026.'));

    expect(markRead).toHaveBeenCalledWith(notification().id);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/quotes/${QUOTE_ID}`));
    expect(useNotificationsStore.getState().unreadCount).toBeGreaterThanOrEqual(2);
  });

  it('polls every 60 seconds while the tab is visible', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const count = vi.spyOn(notificationsService, 'unreadCount').mockResolvedValue({ count: 0 });
    renderAt('/');
    await waitFor(() => expect(count).toHaveBeenCalledTimes(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(count).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('unread-count')).toBeNull();
  });
});

describe('NotificationsPage', () => {
  it('renders texts with their markers and dims resolved quotes', async () => {
    vi.spyOn(notificationsService, 'unreadCount').mockResolvedValue({ count: 1 });
    vi.spyOn(notificationsService, 'list').mockResolvedValue({
      items: [
        notification({
          id: '7e8f90a1-b2c3-4d4e-9f5a-6b7c8d9e0f1a',
          type: 'QUOTE_NO_FOLLOW_UP',
          params: { quoteId: QUOTE_ID, quoteNumber: 'COT-0012', customerName: 'Acme SAS', days: 6 },
          readAt: '2026-11-03T13:00:00.000Z',
          quote: { id: QUOTE_ID, displayNumber: 'COT-0012', status: 'APPROVED' },
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
    renderAt('/notifications');

    const row = (
      await screen.findByText('COT-0012 de Acme SAS lleva 6 días sin seguimiento.')
    ).closest('button');
    expect(row?.className).toContain('opacity-60');
    expect(within(row as HTMLElement).getByText(es.notifications.resolved)).toBeTruthy();
  });
});
