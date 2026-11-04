import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DashboardSummaryDto } from '@zentia/shared';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrivateLayout } from '../../../core/layout';
import es from '../../../lang/es.json';
import { signIn } from '../../../test/session-fixture';
import { useQuoteFiltersStore } from '../../quotes';
import { dashboardService } from '../services/dashboard.service';
import { useDashboardFiltersStore } from '../store/dashboard-filters.store';
import { DashboardPage } from './dashboard-page';

vi.mock('./dashboard-charts', () => ({ default: () => <p>gráficos</p> }));

function summary(overrides: Partial<DashboardSummaryDto['period']> = {}): DashboardSummaryDto {
  return {
    scope: { ownerId: null },
    current: { active: 4, pendingFollowUp: 2, followUpDays: 5 },
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
  render(<RouterProvider router={router} />);
  return router;
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

  it('opens the quotes list filtered by status from the cards', async () => {
    signIn('SELLER');
    vi.spyOn(dashboardService, 'summary').mockResolvedValue(summary());
    const router = renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: new RegExp(es.dashboard.kpi.active) }),
    );
    await waitFor(() => expect(router.state.location.pathname).toBe('/quotes'));
    expect(useQuoteFiltersStore.getState().statuses).toEqual(['SENT']);
  });
});
