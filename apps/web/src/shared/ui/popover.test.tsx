import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Popover } from './popover';

function Harness({ align }: { align?: 'start' | 'end' }) {
  const [open, setOpen] = useState(true);
  const anchorRef = useRef<HTMLButtonElement>(null);
  return (
    <header data-testid="header" className="isolate overflow-hidden">
      <button ref={anchorRef} type="button" onClick={() => setOpen((value) => !value)}>
        Perfil
      </button>
      {open ? (
        <Popover
          anchorRef={anchorRef}
          onClose={() => setOpen(false)}
          role="menu"
          aria-label="Menú"
          {...(align ? { align } : {})}
        >
          <button type="button">Cerrar sesión</button>
        </Popover>
      ) : null}
    </header>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Popover', () => {
  it('renders in document.body, outside the isolated header that clipped it', () => {
    render(<Harness />);
    const panel = screen.getByRole('menu', { name: 'Menú' });
    expect(panel.parentElement).toBe(document.body);
    expect(screen.getByTestId('header').contains(panel)).toBe(false);
    expect(panel.className).toContain('fixed');
    expect(panel.className).toContain('z-40');
  });

  it('aligns to the right edge of the trigger by default and to the left with start', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(256);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      bottom: 50,
      left: 700,
      right: 760,
    } as DOMRect);
    render(<Harness />);
    expect(screen.getByRole('menu').style.left).toBe(`${760 - 256}px`);
    expect(screen.getByRole('menu').style.top).toBe('58px');
    cleanup();
    render(<Harness align="start" />);
    expect(screen.getByRole('menu').style.left).toBe(
      `${Math.min(700, window.innerWidth - 8 - 256)}px`,
    );
  });

  it('stays open when clicking inside and closes with Escape or an outside click', () => {
    render(<Harness />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Perfil' }));

    fireEvent.click(screen.getByRole('button', { name: 'Perfil' }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
