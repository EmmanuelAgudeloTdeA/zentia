import { act, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import en from '../../lang/en.json';
import es from '../../lang/es.json';
import { useSessionStore } from '../auth';
import type { NavItem } from '../navigation';
import { PrivateLayout } from './private-layout';
import { PublicLayout } from './public-layout';

const NAV_ITEMS: NavItem[] = [
  { to: '/users', labelKey: 'notFound.title', order: 2, roles: ['ADMIN'] },
  { to: '/', labelKey: 'common.back', order: 1 },
];

function renderPrivate() {
  const router = createMemoryRouter(
    [{ element: <PrivateLayout navItems={NAV_ITEMS} />, children: [{ path: '/', element: null }] }],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
}

describe('PrivateLayout', () => {
  it('renders texts from lang/ and filters navigation by role', () => {
    useSessionStore
      .getState()
      .setSession({ id: '1', name: 'Ana', email: 'ana@x.co', role: 'SELLER' }, 'token');
    renderPrivate();

    expect(screen.getByRole('navigation', { name: es.layout.nav.label })).toBeTruthy();
    expect(screen.getByRole('link', { name: es.common.back })).toBeTruthy();
    expect(screen.queryByRole('link', { name: es.notFound.title })).toBeNull();
  });

  it('applies the language change and persists it', () => {
    renderPrivate();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: es.language.en }));
    });

    expect(screen.getByRole('navigation', { name: en.layout.nav.label })).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('zentia.locale')).toContain('"en"');
  });

  it('opens the navigation drawer and closes it with Escape', () => {
    renderPrivate();
    const toggle = screen.getByRole('button', { name: es.layout.nav.open });

    fireEvent.click(toggle);
    expect(screen.getByRole('dialog', { name: es.layout.nav.label })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('PublicLayout', () => {
  it('offers the language switch', () => {
    const router = createMemoryRouter(
      [{ element: <PublicLayout />, children: [{ path: '/login', element: null }] }],
      { initialEntries: ['/login'] },
    );
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('group', { name: es.language.label })).toBeTruthy();
  });
});
