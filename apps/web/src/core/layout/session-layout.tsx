import { useSessionStore } from '../auth';
import type { NavItem } from '../navigation';
import { PrivateLayout } from './private-layout';
import { PublicLayout } from './public-layout';

interface SessionLayoutProps {
  navItems: readonly NavItem[];
}

export function SessionLayout({ navItems }: SessionLayoutProps) {
  const authenticated = useSessionStore((state) => state.status === 'authenticated');
  return authenticated ? <PrivateLayout navItems={navItems} /> : <PublicLayout />;
}
