import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useSessionStore } from '../auth';
import { LOGIN_PATH, ProtectedRoute } from './protected-route';

function renderAt(path: string, roles?: readonly string[]) {
  const router = createMemoryRouter(
    [
      { path: LOGIN_PATH, element: <p>login page</p> },
      {
        element: roles ? <ProtectedRoute roles={roles} /> : <ProtectedRoute />,
        children: [{ path: '/private', element: <p>private page</p> }],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('ProtectedRoute', () => {
  it('redirects to the login when there is no session and keeps the requested route', () => {
    const router = renderAt('/private');

    expect(screen.getByText('login page')).toBeTruthy();
    expect(router.state.location.state).toMatchObject({ from: { pathname: '/private' } });
  });

  it('renders the route when there is a session', () => {
    useSessionStore
      .getState()
      .setSession({ id: '1', name: 'Ana', email: 'ana@x.co', role: 'SELLER' }, 'token');
    renderAt('/private');

    expect(screen.getByText('private page')).toBeTruthy();
  });

  it('shows the forbidden page when the role is not allowed', () => {
    useSessionStore
      .getState()
      .setSession({ id: '1', name: 'Ana', email: 'ana@x.co', role: 'SELLER' }, 'token');
    renderAt('/private', ['ADMIN']);

    expect(screen.getByText('No tienes permiso para ver esta página.')).toBeTruthy();
    expect(screen.queryByText('private page')).toBeNull();
  });
});
