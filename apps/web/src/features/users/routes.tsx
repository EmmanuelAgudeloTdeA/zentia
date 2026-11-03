import type { RouteObject } from 'react-router';
import type { NavItem } from '../../core/navigation';
import { ProtectedRoute } from '../../core/router/protected-route';
import { UsersPage } from './components/users-page';

export const USERS_PATH = '/users';

export const routes: RouteObject[] = [
  {
    element: <ProtectedRoute roles={['ADMIN']} />,
    children: [{ path: USERS_PATH, element: <UsersPage /> }],
  },
];

export const navItems: readonly NavItem[] = [
  { to: USERS_PATH, labelKey: 'nav.users', order: 80, roles: ['ADMIN'] },
];
