import type { RouteObject } from 'react-router';
import type { NavItem } from '../../core/navigation';
import { ProtectedRoute } from '../../core/router/protected-route';
import { CompanySettingsPage } from './components/company-settings-page';

export const SETTINGS_PATH = '/settings';

export const routes: RouteObject[] = [
  {
    element: <ProtectedRoute roles={['ADMIN']} />,
    children: [{ path: SETTINGS_PATH, element: <CompanySettingsPage /> }],
  },
];

export const navItems: readonly NavItem[] = [
  { to: SETTINGS_PATH, labelKey: 'nav.settings', order: 90, roles: ['ADMIN'] },
];
