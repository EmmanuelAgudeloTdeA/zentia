import type { RouteObject } from 'react-router';
import type { NavItem } from '../../core/navigation';
import { NOTIFICATIONS_PATH } from '../../core/notifications';
import { NotificationsPage } from './components/notifications-page';

export const routes: RouteObject[] = [{ path: NOTIFICATIONS_PATH, element: <NotificationsPage /> }];

/** Sin entrada en la barra principal: se llega desde la campana y el menú de usuario (G4). */
export const navItems: readonly NavItem[] = [];
