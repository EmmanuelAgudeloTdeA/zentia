import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router';
import type { NavItem } from '../../core/navigation';
import { Skeleton } from '../../shared/ui';

// Carga diferida (tech-plan M8 §4): el tablero y sus gráficos no van en el bundle inicial.
const DashboardPage = lazy(() =>
  import('./components/dashboard-page').then((module) => ({ default: module.DashboardPage })),
);

function DashboardFallback() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} className="h-36 rounded-xl" />
      ))}
    </div>
  );
}

/** El tablero es la página de inicio de los tres roles (S8.2.1). */
export const routes: RouteObject[] = [
  {
    index: true,
    element: (
      <Suspense fallback={<DashboardFallback />}>
        <DashboardPage />
      </Suspense>
    ),
  },
];

export const navItems: readonly NavItem[] = [{ to: '/', labelKey: 'nav.dashboard', order: 0 }];
