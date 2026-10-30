import { createBrowserRouter, type RouteObject } from 'react-router';
import * as auth from '../../features/auth';
import * as companySettings from '../../features/company-settings';
import * as home from '../../features/home';
import { NotFoundPage, PrivateLayout, PublicLayout, SessionLayout } from '../layout';
import type { NavItem } from '../navigation';
import { ProtectedRoute } from './protected-route';

interface FeatureModule {
  routes: RouteObject[];
  navItems: readonly NavItem[];
  publicRoutes?: RouteObject[];
}

const FEATURES: readonly FeatureModule[] = [home, auth, companySettings];

const navItems = FEATURES.flatMap((feature) => feature.navItems);
const headerEnd = <auth.UserMenu />;

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
