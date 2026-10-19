import type { RouteObject } from 'react-router';
import { CHANGE_PASSWORD_PATH, LOGIN_PATH } from '../../core/auth';
import type { NavItem } from '../../core/navigation';
import { ChangePasswordPage } from './components/change-password-page';
import { LoginPage } from './components/login-page';

export const publicRoutes: RouteObject[] = [{ path: LOGIN_PATH, element: <LoginPage /> }];

export const routes: RouteObject[] = [
  { path: CHANGE_PASSWORD_PATH, element: <ChangePasswordPage /> },
];

export const navItems: readonly NavItem[] = [];
