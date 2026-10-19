import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { CHANGE_PASSWORD_PATH, LOGIN_PATH, useSessionStore } from '../../../core/auth';
import { Avatar, ChevronDownIcon, KeyIcon, LogOutIcon } from '../../../shared/ui';
import { logout } from '../services/session.service';

const ITEM_CLASSES =
  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-body text-neutral-700 hover:bg-neutral-100 focus-visible:bg-neutral-100';

export function UserMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    containerRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const onLogout = async () => {
    setOpen(false);
    await logout();
    navigate(LOGIN_PATH, { replace: true });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-md py-1 pr-1 pl-1 text-left text-white hover:bg-white/10 sm:pr-2"
      >
        <Avatar name={user.name} tone="dark" />
        <span className="hidden min-w-0 flex-col sm:flex">
          <span className="max-w-40 truncate text-body-sm font-semibold">{user.name}</span>
          <span className="text-caption text-white/75">{t(`enums.Role.${user.role}`)}</span>
        </span>
        <ChevronDownIcon size={16} className="text-white/75" />
        <span className="sr-only">{t('userMenu.label')}</span>
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t('userMenu.label')}
          className="absolute right-0 z-40 mt-2 w-64 rounded-lg border border-neutral-200 bg-neutral-0 p-2 shadow-md"
        >
          <div className="mb-1 rounded-md bg-neutral-50 px-3 py-2">
            <p className="truncate text-body-sm font-semibold text-neutral-900">{user.name}</p>
            <p className="truncate text-caption text-neutral-600">{user.email}</p>
            <p className="mt-1 text-overline text-primary-600 uppercase">
              {t(`enums.Role.${user.role}`)}
            </p>
          </div>
          {user.mustChangePassword ? null : (
            <Link
              role="menuitem"
              to={CHANGE_PASSWORD_PATH}
              onClick={() => setOpen(false)}
              className={ITEM_CLASSES}
            >
              <KeyIcon size={16} />
              {t('userMenu.changePassword')}
            </Link>
          )}
          <div className="my-1 border-t border-neutral-200" />
          <button
            type="button"
            role="menuitem"
            onClick={() => void onLogout()}
            className={`${ITEM_CLASSES} text-danger-fg hover:bg-danger-bg focus-visible:bg-danger-bg`}
          >
            <LogOutIcon size={16} />
            {t('auth.logout')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
