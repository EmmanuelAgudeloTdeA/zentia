import type { Role } from '@zentia/shared';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { signIn } from '../../test/session-fixture';
import { CHANGE_PASSWORD_PATH, LOGIN_PATH } from '../auth';
import { ProtectedRoute } from './protected-route';

function renderAt(path: string, roles?: readonly Role[]) {
  const router = createMemoryRouter(
    [
      { path: LOGIN_PATH, element: <p>login page</p> },
      {
        element: roles ? <ProtectedRoute roles={roles} /> : <ProtectedRoute />,
        children: [
          { path: '/private', element: <p>private page</p> },
          { path: CHANGE_PASSWORD_PATH, element: <p>change password page</p> },
        ],
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
    signIn('SELLER');
    renderAt('/private');

    expect(screen.getByText('private page')).toBeTruthy();
  });

  it('shows the forbidden page when the role is not allowed', () => {
    signIn('SELLER');
    renderAt('/private', ['ADMIN']);

    expect(screen.getByText('No tienes permiso para ver esta página.')).toBeTruthy();
    expect(screen.queryByText('private page')).toBeNull();
  });

  it('only allows the change-password page while mustChangePassword is set', () => {
    signIn('ADMIN', { mustChangePassword: true });
    const router = renderAt('/private');

    expect(screen.getByText('change password page')).toBeTruthy();
    expect(router.state.location.pathname).toBe(CHANGE_PASSWORD_PATH);
  });
});
