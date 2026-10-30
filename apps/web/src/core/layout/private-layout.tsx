import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router';
import { MenuIcon } from '../../shared/ui';
import { useSessionStore } from '../auth';
import { LanguageSwitch } from '../i18n';
import { visibleNavItems, type NavItem } from '../navigation';
import { BrandBackdrop } from './brand-backdrop';
import { BrandMark } from './brand-mark';
import { NavDrawer } from './nav-drawer';
import { PageHeaderSlotContext } from './page-header';

const DRAWER_ID = 'main-nav-drawer';
const GUTTER = 'px-4 md:px-6 lg:px-8';

interface PrivateLayoutProps {
  navItems: readonly NavItem[];
  headerEnd?: ReactNode;
}

export function PrivateLayout({ navItems, headerEnd }: PrivateLayoutProps) {
  const { t } = useTranslation();
  const role = useSessionStore((state) => state.user?.role);
  const mustChangePassword = useSessionStore((state) => state.user?.mustChangePassword ?? false);
  // Con el cambio de contraseña pendiente solo se permite esa pantalla y cerrar sesión (S1.1.4).
  const items = mustChangePassword ? [] : visibleNavItems(navItems, role);
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <PageHeaderSlotContext.Provider value={headerSlot}>
      <div className="min-h-screen bg-neutral-100 text-neutral-900">
        <header className="relative isolate overflow-hidden bg-linear-120 from-brand-ink via-brand-indigo to-brand-periwinkle text-white">
          <BrandBackdrop />
          <div className="border-b border-white/10">
            <div className={`mx-auto flex h-18 max-w-content items-center gap-3 ${GUTTER}`}>
              <button
                ref={toggleRef}
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={t('layout.nav.open')}
                aria-expanded={drawerOpen}
                aria-controls={DRAWER_ID}
                className="-ml-2 inline-flex size-10 items-center justify-center rounded-md hover:bg-white/10 lg:hidden"
              >
                <MenuIcon />
              </button>
              <BrandMark />
              <nav aria-label={t('layout.nav.label')} className="ml-6 hidden lg:block">
                <ul className="flex items-center gap-1">
                  {items.map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                          `block whitespace-nowrap rounded-md px-3 py-2 text-body font-medium transition-colors duration-150 ${
                            isActive
                              ? 'bg-white/15 text-white'
                              : 'text-white/80 hover:bg-white/10 hover:text-white'
                          }`
                        }
                      >
                        {t(item.labelKey)}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto flex items-center gap-3">
                <div className="hidden lg:block">
                  <LanguageSwitch tone="dark" />
                </div>
                {headerEnd}
              </div>
            </div>
          </div>
          <div
            ref={setHeaderSlot}
            className={`mx-auto max-w-content pt-5 pb-7 empty:hidden ${GUTTER}`}
          />
        </header>
        <main className={`mx-auto max-w-content py-6 ${GUTTER}`}>
          <Outlet />
        </main>
        {drawerOpen ? <NavDrawer id={DRAWER_ID} items={items} onClose={closeDrawer} /> : null}
      </div>
    </PageHeaderSlotContext.Provider>
  );
}
