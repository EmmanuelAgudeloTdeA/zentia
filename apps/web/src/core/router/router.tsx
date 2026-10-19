import { createBrowserRouter, type RouteObject } from 'react-router';
import * as home from '../../features/home';
import { NotFoundPage, PrivateLayout, PublicLayout, SessionLayout } from '../layout';
import type { NavItem } from '../navigation';
import { LOGIN_PATH, ProtectedRoute } from './protected-route';

interface FeatureModule {
  routes: RouteObject[];
  navItems: readonly NavItem[];
  publicRoutes?: RouteObject[];
}

const FEATURES: readonly FeatureModule[] = [home];

const navItems = FEATURES.flatMap((feature) => feature.navItems);

export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { path: LOGIN_PATH, element: null },
      ...FEATURES.flatMap((feature) => feature.publicRoutes ?? []),
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <PrivateLayout navItems={navItems} />,
        children: FEATURES.flatMap((feature) => feature.routes),
      },
    ],
  },
  {
    element: <SessionLayout navItems={navItems} />,
    children: [{ path: '*', element: <NotFoundPage /> }],
  },
];

export const router = createBrowserRouter(routes);
