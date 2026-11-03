import type { RouteObject } from 'react-router';
import type { NavItem } from '../../core/navigation';
import { ProductsPage } from './components/products-page';

export const PRODUCTS_PATH = '/products';

export const routes: RouteObject[] = [{ path: PRODUCTS_PATH, element: <ProductsPage /> }];

export const navItems: readonly NavItem[] = [
  { to: PRODUCTS_PATH, labelKey: 'nav.products', order: 30 },
];
