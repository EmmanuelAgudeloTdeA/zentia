import type { RouteObject } from 'react-router';
import type { NavItem } from '../../core/navigation';
import { CustomerDetailPage } from './components/customer-detail-page';
import { CustomersPage } from './components/customers-page';

export const CUSTOMERS_PATH = '/customers';

export const routes: RouteObject[] = [
  { path: CUSTOMERS_PATH, element: <CustomersPage /> },
  { path: `${CUSTOMERS_PATH}/:id`, element: <CustomerDetailPage /> },
];

export const navItems: readonly NavItem[] = [
  { to: CUSTOMERS_PATH, labelKey: 'nav.customers', order: 20 },
];
