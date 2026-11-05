import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  id?: string;
  role?: string;
  'aria-label'?: string;
  className?: string;
  /** `end`: borde derecho con el del disparador (menús del encabezado); `start`: borde izquierdo. */
  align?: 'start' | 'end';
}

const GAP = 8;
const VIEWPORT_MARGIN = 8;

/** Panel anclado a su disparador, en un portal: ningún contenedor con `isolate` u `overflow` lo tapa. */
export function Popover({
  anchorRef,
  onClose,
  children,
  className = '',
  align = 'end',
  ...attributes
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    const width = panelRef.current?.offsetWidth ?? 0;
    if (!anchor) return;
    const maxLeft = window.innerWidth - VIEWPORT_MARGIN - width;
    setPosition({
      top: anchor.bottom + GAP,
      left: Math.max(
        VIEWPORT_MARGIN,
        Math.min(align === 'end' ? anchor.right - width : anchor.left, maxLeft),
      ),
    });
  }, [anchorRef, align]);

  useEffect(() => {
    const inside = (target: EventTarget | null) =>
      target instanceof Node &&
      (panelRef.current?.contains(target) || anchorRef.current?.contains(target));
    const onPointerDown = (event: PointerEvent) => {
      if (!inside(event.target)) onCloseRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onCloseRef.current();
      anchorRef.current?.focus();
    };
    const onScroll = (event: Event) => {
      if (!inside(event.target)) onCloseRef.current();
    };
    const onResize = () => onCloseRef.current();
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [anchorRef]);

  return createPortal(
    <div
      ref={panelRef}
      {...attributes}
      style={position ?? { top: 0, left: 0, visibility: 'hidden' }}
      className={`fixed z-40 rounded-lg border border-neutral-200 bg-neutral-0 shadow-md ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}
