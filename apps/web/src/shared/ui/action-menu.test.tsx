import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionMenu } from './action-menu';

const rect = (top: number, bottom: number, right: number) =>
  ({
    top,
    bottom,
    right,
    left: right - 32,
    width: 32,
    height: bottom - top,
    x: 0,
    y: top,
  }) as DOMRect;

function renderMenu(onSelect = vi.fn(), onRowClick = vi.fn()) {
  render(
    <div data-testid="clipping" style={{ overflow: 'hidden' }} onClick={onRowClick}>
      <ActionMenu
        label="Más acciones"
        items={[
          { key: 'pdf', label: 'Descargar PDF', onSelect },
          { key: 'void', label: 'Anular', tone: 'danger', separatorBefore: true, onSelect },
        ]}
      />
    </div>,
  );
  return { onSelect, onRowClick };
}

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ActionMenu', () => {
  it('renders the panel in document.body, outside the clipping container', () => {
    renderMenu();
    open();
    const menu = screen.getByRole('menu');
    expect(menu.parentElement).toBe(document.body);
    expect(screen.getByTestId('clipping').contains(menu)).toBe(false);
    expect(menu.className).toContain('fixed');
    expect(menu.className).toContain('z-40');
    expect(screen.getAllByRole('separator')).toHaveLength(1);
  });

  it('opens below the trigger aligned to its right edge, and upward when there is no room', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(192);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(100);
    const trigger = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect');
    trigger.mockReturnValue(rect(100, 132, 900));
    renderMenu();
    open();
    expect(screen.getByRole('menu').style.top).toBe('136px');
    expect(screen.getByRole('menu').style.left).toBe(`${900 - 192}px`);

    fireEvent.keyDown(document, { key: 'Escape' });
    trigger.mockReturnValue(rect(window.innerHeight - 40, window.innerHeight - 8, 900));
    open();
    expect(screen.getByRole('menu').style.top).toBe(`${window.innerHeight - 40 - 4 - 100}px`);
  });

  it('closes with Escape, outside clicks and scroll, returning focus to the trigger', () => {
    renderMenu();
    open();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Más acciones' }));

    open();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();

    open();
    fireEvent.scroll(window);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('runs the item and never bubbles the click to the row', () => {
    const { onSelect, onRowClick } = renderMenu();
    open();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Descargar PDF' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
