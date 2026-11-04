import { createBrowserRouter, type RouteObject } from 'react-router';
import * as auth from '../../features/auth';
import * as catalog from '../../features/catalog';
import * as companySettings from '../../features/company-settings';
import * as customers from '../../features/customers';
import * as dashboard from '../../features/dashboard';
import * as notifications from '../../features/notifications';
import * as orders from '../../features/orders';
import * as quotes from '../../features/quotes';
import * as users from '../../features/users';
import { NotFoundPage, PrivateLayout, PublicLayout, SessionLayout } from '../layout';
import type { NavItem } from '../navigation';
import { ProtectedRoute } from './protected-route';

interface FeatureModule {
  routes: RouteObject[];
  navItems: readonly NavItem[];
  publicRoutes?: RouteObject[];
}

const FEATURES: readonly FeatureModule[] = [
  dashboard,
  auth,
  quotes,
  orders,
  customers,
  catalog,
  notifications,
  users,
  companySettings,
];

const navItems = FEATURES.flatMap((feature) => feature.navItems);
const headerEnd = (
  <>
    <quotes.NewQuoteButton />
    <notifications.NotificationBell />
    <auth.UserMenu />
  </>
);

export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: FEATURES.flatMap((feature) => feature.publicRoutes ?? []),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <PrivateLayout navItems={navItems} headerEnd={headerEnd} />,
        children: FEATURES.flatMap((feature) => feature.routes),
      },
    ],
  },
  {
    element: <SessionLayout navItems={navItems} headerEnd={headerEnd} />,
    children: [{ path: '*', element: <NotFoundPage /> }],
  },
];

export const router = createBrowserRouter(routes);
