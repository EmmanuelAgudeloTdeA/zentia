import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { NotificationDto } from '@zentia/shared';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '../../../core/auth';
import { PrivateLayout } from '../../../core/layout';
import { useNotificationsStore } from '../../../core/notifications';
import es from '../../../lang/es.json';
import { toast } from '../../../shared/ui';
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
    probability: null,
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
      sort: 'date',
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

describe('NotificationBell (audit)', () => {
  const listResult = (items: NotificationDto[]) => ({
    items,
    total: items.length,
    page: 1,
    pageSize: 10,
    sort: 'date' as const,
  });

  it('does not poll while the tab is hidden', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    const count = vi.spyOn(notificationsService, 'unreadCount').mockResolvedValue({ count: 0 });
    renderAt('/');
    await waitFor(() => expect(count).toHaveBeenCalledTimes(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(180_000);
    });
    expect(count).toHaveBeenCalledTimes(1);
    visibility.mockRestore();
  });

  it('asks the panel for the latest 10 notifications sorted by date', async () => {
    vi.spyOn(notificationsService, 'unreadCount').mockResolvedValue({ count: 1 });
    const list = vi
      .spyOn(notificationsService, 'list')
      .mockResolvedValue(listResult([notification()]));
    renderAt('/');
    fireEvent.click(await screen.findByRole('button', { name: 'Notificaciones (1 sin leer)' }));
    await waitFor(() => expect(list).toHaveBeenCalledWith({ sort: 'date', page: 1, pageSize: 10 }));
  });

  it('sets the count to 0 after marking all as read', async () => {
    vi.spyOn(notificationsService, 'unreadCount').mockResolvedValue({ count: 2 });
    vi.spyOn(notificationsService, 'list').mockResolvedValue(listResult([notification()]));
    const markAll = vi.spyOn(notificationsService, 'markAllRead').mockResolvedValue(undefined);
    renderAt('/');
    fireEvent.click(await screen.findByRole('button', { name: 'Notificaciones (2 sin leer)' }));
    fireEvent.click(await screen.findByRole('button', { name: es.notifications.markAllRead }));
    await waitFor(() => expect(useNotificationsStore.getState().unreadCount).toBe(0));
    expect(markAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('unread-count')).toBeNull();
  });

  it('shows a translated toast and keeps the count when marking all fails', async () => {
    vi.spyOn(notificationsService, 'unreadCount').mockResolvedValue({ count: 2 });
    vi.spyOn(notificationsService, 'list').mockResolvedValue(listResult([notification()]));
    vi.spyOn(notificationsService, 'markAllRead').mockRejectedValue(new Error('offline'));
    const error = vi.spyOn(toast, 'error');
    renderAt('/');
    fireEvent.click(await screen.findByRole('button', { name: 'Notificaciones (2 sin leer)' }));
    fireEvent.click(await screen.findByRole('button', { name: es.notifications.markAllRead }));
    await waitFor(() => expect(error).toHaveBeenCalledWith(es.errors.UNKNOWN));
    expect(useNotificationsStore.getState().unreadCount).toBe(2);
  });

  it('does not lower the count when marking one as read fails', async () => {
    vi.spyOn(notificationsService, 'unreadCount').mockResolvedValue({ count: 3 });
    vi.spyOn(notificationsService, 'list').mockResolvedValue(listResult([notification()]));
    const markRead = vi
      .spyOn(notificationsService, 'markRead')
      .mockRejectedValue(new Error('offline'));
    const router = renderAt('/');
    fireEvent.click(await screen.findByRole('button', { name: 'Notificaciones (3 sin leer)' }));
    fireEvent.click(await screen.findByText('COT-0012 de Acme SAS vence el 06/11/2026.'));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/quotes/${QUOTE_ID}`));
    await waitFor(() => expect(markRead).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(useNotificationsStore.getState().unreadCount).toBe(3);
  });

  it('clears the count when the session is cleared (next user in the same tab)', async () => {
    useNotificationsStore.getState().setUnreadCount(5);
    useSessionStore.getState().clearSession();
    expect(useNotificationsStore.getState().unreadCount).toBeNull();
  });
});

describe('NotificationsPage', () => {
  it('uses the singular for a single day without follow-up', async () => {
    vi.spyOn(notificationsService, 'unreadCount').mockResolvedValue({ count: 0 });
    vi.spyOn(notificationsService, 'list').mockResolvedValue({
      items: [
        notification({
          type: 'QUOTE_NO_FOLLOW_UP',
          params: { quoteId: QUOTE_ID, quoteNumber: 'COT-0012', customerName: 'Acme SAS', days: 1 },
        }),
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      sort: 'probability',
    });
    renderAt('/notifications');
    expect(
      await screen.findByText('COT-0012 de Acme SAS lleva 1 día sin seguimiento.'),
    ).toBeTruthy();
  });

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
      sort: 'probability',
    });
    renderAt('/notifications');

    const row = (
      await screen.findByText('COT-0012 de Acme SAS lleva 6 días sin seguimiento.')
    ).closest('button');
    expect(row?.className).toContain('opacity-60');
    expect(within(row as HTMLElement).getByText(es.notifications.resolved)).toBeTruthy();
  });

  it('sorts by probability by default, shows compact badges and the date fallback notice', async () => {
    vi.spyOn(notificationsService, 'unreadCount').mockResolvedValue({ count: 0 });
    const list = vi.spyOn(notificationsService, 'list').mockResolvedValue({
      items: [notification({ probability: 55 })],
      total: 1,
      page: 1,
      pageSize: 20,
      sort: 'date',
    });
    renderAt('/notifications');

    expect(await screen.findByText(`55 % · ${es.ai.probability.rulesEstimateShort}`)).toBeTruthy();
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ sort: 'probability' }));
    expect(screen.getByText(es.notifications.sort.fallbackNotice)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(es.notifications.sort.label), {
      target: { value: 'date' },
    });
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'date' })),
    );
    await waitFor(() =>
      expect(screen.queryByText(es.notifications.sort.fallbackNotice)).toBeNull(),
    );
  });
});
