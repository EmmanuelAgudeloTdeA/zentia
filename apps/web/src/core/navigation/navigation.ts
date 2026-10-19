import type { RoleCode } from '../auth';

export interface NavItem {
  to: string;
  labelKey: string;
  order: number;
  roles?: readonly RoleCode[];
}

export function visibleNavItems(items: readonly NavItem[], role: RoleCode | undefined): NavItem[] {
  return items
    .filter((item) => !item.roles || (role !== undefined && item.roles.includes(role)))
    .sort((a, b) => a.order - b.order);
}
