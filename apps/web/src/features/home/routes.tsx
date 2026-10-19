import type { RouteObject } from 'react-router';
import type { NavItem } from '../../core/navigation';
import { HomePage } from './components/home-page';

export const routes: RouteObject[] = [{ index: true, element: <HomePage /> }];

export const navItems: readonly NavItem[] = [];
