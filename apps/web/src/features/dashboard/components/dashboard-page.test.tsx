import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DashboardSummaryDto } from '@zentia/shared';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '../../../core/auth';
import { ApiError } from '../../../core/errors';
import { PrivateLayout } from '../../../core/layout';
import es from '../../../lang/es.json';
import { signIn } from '../../../test/session-fixture';
import { QUOTES_PATH, useQuoteFiltersStore } from '../../quotes';
import { usersService } from '../../users';
import { dashboardService } from '../services/dashboard.service';
import { useDashboardFiltersStore } from '../store/dashboard-filters.store';
import { DashboardPage } from './dashboard-page';

vi.mock('./dashboard-charts', () => ({ default: () => <p>gráficos</p> }));

const SELLER = {
  id: '5d2e1f3a-4b5c-4d6e-8f70-1a2b3c4d5e6f',
  name: 'Beto Ruiz',
  role: 'SELLER' as const,
  isActive: true,
};

function summary(
  overrides: Partial<DashboardSummaryDto['period']> = {},
  current: Partial<DashboardSummaryDto['current']> = {},
): DashboardSummaryDto {
  return {
    scope: { ownerId: null },
    current: { active: 4, pendingFollowUp: 2, followUpDays: 5, ...current },
    period: {
      from: '2026-11-01',
      to: '2026-11-30',
      approved: 3,
      rejected: 4,
      expired: 1,
      closed: 8,
      quotedAmount: '12000000',
      approvedAmount: '5375000',
      conversionRate: '37.50',
      ...overrides,
    },
    sections: [],
  };
}

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        element: <PrivateLayout navItems={[]} />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/quotes', element: <p>listado</p> },
        ],
      },
    ],
    { initialEntries: ['/'] },
  );
  const view = render(<RouterProvider router={router} />);
  return Object.assign(router, { unmount: view.unmount });
}

afterEach(() => {
  vi.restoreAllMocks();
  useDashboardFiltersStore.setState({
    preset: 'thisMonth',
    customFrom: '',
    customTo: '',
    owner: null,
    ownerInput: '',
  });
  useQuoteFiltersStore.getState().reset();
});

describe('DashboardPage', () => {
  it('greets the user and shows the indicators with their universe', async () => {
    signIn('SELLER', { name: 'Ana Gómez' });
    vi.spyOn(dashboardService, 'summary').mockResolvedValue(summary());
    renderPage();

    expect(
      await screen.findByText('Tienes 2 cotizaciones pendientes de seguimiento.'),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Ana$/);
    expect(screen.getByText('37,50 %')).toBeTruthy();
    expect(screen.getAllByText(es.dashboard.currentStateHint)).toHaveLength(2);
    expect(screen.getAllByText('Período: 01/11/2026 – 30/11/2026').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(es.dashboard.seller.label)).toBeNull();
    expect(await screen.findByText('gráficos')).toBeTruthy();
  });

  it('shows "Sin datos" when no quote closed in the period', async () => {
    signIn('MANAGER');
    vi.spyOn(dashboardService, 'summary').mockResolvedValue(
      summary({
        approved: 0,
        rejected: 0,
        expired: 0,
        closed: 0,
        conversionRate: null,
        quotedAmount: '0',
        approvedAmount: '0',
      }),
    );
    renderPage();
    expect(await screen.findByText(es.dashboard.noData)).toBeTruthy();
    expect(screen.getByLabelText(es.dashboard.seller.label)).toBeTruthy();
    expect(screen.getByText(es.dashboard.empty.period)).toBeTruthy();
  });

  it('switches presets and validates the custom period before asking the API', async () => {
    signIn('ADMIN');
    const call = vi.spyOn(dashboardService, 'summary').mockResolvedValue(summary());
    renderPage();
    await waitFor(() => expect(call).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: es.dashboard.period.lastMonth }));
    await waitFor(() => expect(call).toHaveBeenCalledTimes(2));
    expect(call.mock.calls[1]?.[0]).toMatchObject({ from: expect.stringMatching(/-01$/) });

    fireEvent.click(screen.getByRole('button', { name: es.dashboard.period.custom }));
    fireEvent.change(screen.getByLabelText(es.dashboard.period.from), {
      target: { value: '2026-11-10' },
    });
    fireEvent.change(screen.getByLabelText(es.dashboard.period.to), {
      target: { value: '2026-11-01' },
    });
    expect(await screen.findByText(es.dashboard.period.invalidOrder)).toBeTruthy();
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('opens the active quotes by current state, without the period', async () => {
    signIn('SELLER');
    vi.spyOn(dashboardService, 'summary').mockResolvedValue(summary());
    const router = renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(es.dashboard.kpi.active) }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe(QUOTES_PATH));
    expect(useQuoteFiltersStore.getState()).toMatchObject({
      statuses: ['SENT'],
      owner: null,
      sentPeriod: null,
    });
  });

  it('opens a cohort card with the same status, period and seller as the dashboard', async () => {
    signIn('MANAGER');
    useDashboardFiltersStore.getState().pickOwner({ id: SELLER.id, label: SELLER.name });
    const call = vi.spyOn(dashboardService, 'summary').mockResolvedValue(summary());
    const router = renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(es.enums.QuoteStatus.REJECTED) }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe(QUOTES_PATH));
    expect(call.mock.calls[0]?.[0]).toMatchObject({ ownerId: SELLER.id });
    expect(useQuoteFiltersStore.getState()).toMatchObject({
      statuses: ['REJECTED'],
      owner: { id: SELLER.id, label: SELLER.name },
      sentPeriod: { from: '2026-11-01', to: '2026-11-30' },
    });
  });

  it.each([
    [es.dashboard.kpi.approvedAmount, ['APPROVED'], true, false],
    [es.dashboard.kpi.quotedAmount, ['SENT', 'APPROVED', 'REJECTED', 'EXPIRED'], true, false],
    [es.dashboard.kpi.pendingFollowUp, ['SENT'], false, true],
  ])(
    'opens "%s" in the list with the filters behind its number',
    async (label, statuses, withPeriod, pending) => {
      signIn('MANAGER');
      useDashboardFiltersStore.getState().pickOwner({ id: SELLER.id, label: SELLER.name });
      vi.spyOn(dashboardService, 'summary').mockResolvedValue(summary());
      const router = renderPage();

      fireEvent.click(await screen.findByRole('button', { name: new RegExp(label) }));
      await waitFor(() => expect(router.state.location.pathname).toBe(QUOTES_PATH));
      expect(useQuoteFiltersStore.getState()).toMatchObject({
        statuses,
        owner: { id: SELLER.id, label: SELLER.name },
        sentPeriod: withPeriod ? { from: '2026-11-01', to: '2026-11-30' } : null,
        followUpPending: pending,
      });
    },
  );

  it('filters by a seller and returns to all sellers with the "Todos" option', async () => {
    signIn('ADMIN');
    vi.spyOn(usersService, 'options').mockResolvedValue([SELLER]);
    const call = vi.spyOn(dashboardService, 'summary').mockResolvedValue(summary());
    renderPage();
    await waitFor(() => expect(call).toHaveBeenCalledTimes(1));
    const input = screen.getByLabelText(es.dashboard.seller.label);

    fireEvent.change(input, { target: { value: 'Be' } });
    fireEvent.click(await screen.findByRole('option', { name: SELLER.name }));
    await waitFor(() => expect(call.mock.calls.at(-1)?.[0]).toMatchObject({ ownerId: SELLER.id }));

    fireEvent.change(input, { target: { value: 'Be' } });
    fireEvent.click(await screen.findByRole('option', { name: es.dashboard.seller.all }));
    await waitFor(() => expect(call.mock.calls.at(-1)?.[0].ownerId).toBeUndefined());
    expect(useDashboardFiltersStore.getState()).toMatchObject({ owner: null, ownerInput: '' });
  });

  it('remembers the preset after leaving and coming back', async () => {
    signIn('SELLER');
    const call = vi.spyOn(dashboardService, 'summary').mockResolvedValue(summary());
    const first = renderPage();
    await waitFor(() => expect(call).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: es.dashboard.period.last90Days }));
    await waitFor(() => expect(call).toHaveBeenCalledTimes(2));
    first.unmount();

    renderPage();
    await waitFor(() => expect(call).toHaveBeenCalledTimes(3));
    expect(call.mock.calls[2]?.[0]).toEqual(call.mock.calls[1]?.[0]);
    expect(
      screen
        .getByRole('button', { name: es.dashboard.period.last90Days })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('shows the global empty state when nothing was ever sent', async () => {
    signIn('SELLER');
    vi.spyOn(dashboardService, 'summary').mockResolvedValue(
      summary(
        {
          approved: 0,
          rejected: 0,
          expired: 0,
          closed: 0,
          conversionRate: null,
          quotedAmount: '0',
          approvedAmount: '0',
        },
        { active: 0, pendingFollowUp: 0 },
      ),
    );
    renderPage();
    expect(await screen.findByText(es.dashboard.empty.title)).toBeTruthy();
    expect(screen.getByRole('link', { name: es.quotes.new })).toBeTruthy();
  });

  it('translates an invalid period answered by the API', async () => {
    signIn('SELLER');
    vi.spyOn(dashboardService, 'summary').mockRejectedValue(
      new ApiError('DASHBOARD_INVALID_PERIOD', 400),
    );
    renderPage();
    expect(await screen.findByText(es.errors.DASHBOARD_INVALID_PERIOD)).toBeTruthy();
  });

  it('resets the filters when the session user changes', () => {
    signIn('MANAGER');
    const filters = useDashboardFiltersStore.getState();
    filters.setPreset('last90Days');
    filters.pickOwner({ id: SELLER.id, label: SELLER.name });
    useSessionStore.getState().clearSession();
    expect(useDashboardFiltersStore.getState()).toMatchObject({
      preset: 'thisMonth',
      owner: null,
      ownerInput: '',
    });
  });
});
