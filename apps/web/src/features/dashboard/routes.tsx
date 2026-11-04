import type { RouteObject } from 'react-router';
import type { NavItem } from '../../core/navigation';
import { DashboardPage } from './components/dashboard-page';

/** El tablero es la página de inicio de los tres roles (S8.2.1). */
export const routes: RouteObject[] = [{ index: true, element: <DashboardPage /> }];

export const navItems: readonly NavItem[] = [{ to: '/', labelKey: 'nav.dashboard', order: 0 }];
