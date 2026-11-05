import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreIcon } from './icons';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  /** Línea divisoria antes del ítem (p. ej., para separar la acción destructiva). */
  separatorBefore?: boolean;
  onSelect: () => void;
}

interface ActionMenuProps {
  label: string;
  items: readonly ActionMenuItem[];
  /** `onDark` para el encabezado oscuro de la página. */
  tone?: 'default' | 'onDark';
}

interface Position {
  top: number;
  left: number;
}

const ITEM_CLASSES =
  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-body whitespace-nowrap';
const VIEWPORT_MARGIN = 8;
const GAP = 4;

/** Coloca el panel bajo el disparador alineado a su derecha; si no cabe, lo abre hacia arriba. */
function placeMenu(trigger: DOMRect, menu: { width: number; height: number }): Position {
  const below = trigger.bottom + GAP;
  const fitsBelow = below + menu.height <= window.innerHeight - VIEWPORT_MARGIN;
  const top = fitsBelow ? below : Math.max(VIEWPORT_MARGIN, trigger.top - GAP - menu.height);
  const maxLeft = window.innerWidth - VIEWPORT_MARGIN - menu.width;
  const left = Math.max(VIEWPORT_MARGIN, Math.min(trigger.right - menu.width, maxLeft));
  return { top, left };
}

/** Menú "Más acciones": el panel va en un portal sobre todo el contenido para no recortarse. */
export function ActionMenu({ label, items, tone = 'default' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;
    const { offsetWidth: width, offsetHeight: height } = menuRef.current;
    setPosition(placeMenu(triggerRef.current.getBoundingClientRect(), { width, height }));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const menuItems = () => [
      ...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
    ];
    menuItems()[0]?.focus({ preventScroll: true });
    const close = () => setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close();
    };
    const onScroll = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
      if (event.key === 'Tab') close();
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
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={`inline-flex shrink-0 items-center justify-center rounded-md ${
          tone === 'onDark'
            ? 'size-10 text-white/90 hover:bg-white/10 hover:text-white'
            : 'size-8 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
        }`}
      >
        <MoreIcon size={18} />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              onClick={(event) => event.stopPropagation()}
              style={position ?? { top: 0, left: 0, visibility: 'hidden' }}
              className="fixed z-40 min-w-48 rounded-lg border border-neutral-200 bg-neutral-0 p-1 shadow-md"
            >
              {items.map((item) => (
                <div key={item.key}>
                  {item.separatorBefore ? (
                    <div role="separator" className="my-1 border-t border-neutral-200" />
                  ) : null}
                  <button
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
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
