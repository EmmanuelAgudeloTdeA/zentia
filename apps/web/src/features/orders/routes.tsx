import type { RouteObject } from 'react-router';
import type { NavItem } from '../../core/navigation';
import { OrderDetailPage } from './components/order-detail-page';
import { OrdersListPage } from './components/orders-list-page';

export const ORDERS_PATH = '/orders';

export const routes: RouteObject[] = [
  { path: ORDERS_PATH, element: <OrdersListPage /> },
  { path: `${ORDERS_PATH}/:id`, element: <OrderDetailPage /> },
];

export const navItems: readonly NavItem[] = [
  { to: ORDERS_PATH, labelKey: 'nav.orders', order: 15 },
];
