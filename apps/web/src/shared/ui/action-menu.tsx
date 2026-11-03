import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { MoreIcon } from './icons';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  onSelect: () => void;
}

interface ActionMenuProps {
  label: string;
  items: readonly ActionMenuItem[];
}

const ITEM_CLASSES =
  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-body whitespace-nowrap';

/** Menú "Más acciones" de una fila de tabla. */
export function ActionMenu({ label, items }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const menuItems = () => [
      ...(containerRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
    ];
    menuItems()[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const list = menuItems();
        const index = list.indexOf(document.activeElement as HTMLElement);
        const step = event.key === 'ArrowDown' ? 1 : -1;
        list[(index + step + list.length) % list.length]?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      >
        <MoreIcon size={18} />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className="absolute right-0 z-40 mt-1 min-w-48 rounded-lg border border-neutral-200 bg-neutral-0 p-1 shadow-md"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`${ITEM_CLASSES} ${
                item.tone === 'danger'
                  ? 'text-danger-fg hover:bg-danger-bg focus-visible:bg-danger-bg'
                  : 'text-neutral-700 hover:bg-neutral-100 focus-visible:bg-neutral-100'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
