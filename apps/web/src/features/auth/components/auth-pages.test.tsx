import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHANGE_PASSWORD_PATH, LOGIN_PATH, useSessionStore } from '../../../core/auth';
import { ApiError } from '../../../core/errors';
import { PrivateLayout, PublicLayout } from '../../../core/layout';
import es from '../../../lang/es.json';
import { sessionFixture, signIn } from '../../../test/session-fixture';
import { authService } from '../services/auth.service';
import { ChangePasswordPage } from './change-password-page';
import { LoginPage } from './login-page';
import { UserMenu } from './user-menu';

function renderApp(path: string) {
  const router = createMemoryRouter(
    [
      { element: <PublicLayout />, children: [{ path: LOGIN_PATH, element: <LoginPage /> }] },
      {
        element: <PrivateLayout navItems={[]} headerEnd={<UserMenu />} />,
        children: [
          { path: '/', element: <p>home page</p> },
          { path: CHANGE_PASSWORD_PATH, element: <ChangePasswordPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function fill(label: string, value: string) {
  const input = screen.getByLabelText(new RegExp(`^${label}`));
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LoginPage', () => {
  it('shows field validation from lang/ before calling the API', async () => {
    const login = vi.spyOn(authService, 'login');
    renderApp(LOGIN_PATH);

    fireEvent.click(screen.getByRole('button', { name: es.auth.login.submit }));

    expect(await screen.findAllByText(es.validation.required)).toHaveLength(2);
    expect(login).not.toHaveBeenCalled();
  });

  it('translates INVALID_CREDENTIALS', async () => {
    vi.spyOn(authService, 'login').mockRejectedValue(new ApiError('INVALID_CREDENTIALS', 401));
    renderApp(LOGIN_PATH);

    fill(es.auth.login.email, 'ana@empresa.co');
    fill(es.auth.login.password, 'mala123456');
    fireEvent.click(screen.getByRole('button', { name: es.auth.login.submit }));

    expect(await screen.findByText(es.errors.INVALID_CREDENTIALS)).toBeTruthy();
  });

  it('sends users with a temporary password to the change-password page', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue(sessionFixture({ mustChangePassword: true }));
    const router = renderApp(LOGIN_PATH);

    fill(es.auth.login.email, 'ana@empresa.co');
    fill(es.auth.login.password, 'temporal123');
    fireEvent.click(screen.getByRole('button', { name: es.auth.login.submit }));

    await waitFor(() => expect(router.state.location.pathname).toBe(CHANGE_PASSWORD_PATH));
    expect(await screen.findByText(es.auth.changePassword.forcedTitle)).toBeTruthy();
  });

  it('shows the session-expired notice', () => {
    useSessionStore.getState().clearSession('sessionExpired');
    renderApp(LOGIN_PATH);

    expect(screen.getByText(es.auth.login.sessionExpired)).toBeTruthy();
  });
});

describe('ChangePasswordPage', () => {
  it('maps INVALID_CURRENT_PASSWORD to the current password field', async () => {
    signIn('SELLER');
    vi.spyOn(authService, 'changePassword').mockRejectedValue(
      new ApiError('INVALID_CURRENT_PASSWORD', 400),
    );
    renderApp(CHANGE_PASSWORD_PATH);

    fill(es.auth.changePassword.current, 'mala123456');
    fill(es.auth.changePassword.new, 'nueva2026xy');
    fill(es.auth.changePassword.confirm, 'nueva2026xy');
    fireEvent.click(screen.getByRole('button', { name: es.auth.changePassword.submit }));

    const current = await screen.findByLabelText(new RegExp(`^${es.auth.changePassword.current}`));
    await waitFor(() => expect(current.getAttribute('aria-invalid')).toBe('true'));
    expect(screen.getByText(es.errors.INVALID_CURRENT_PASSWORD)).toBeTruthy();
  });

  it('validates the policy and the confirmation locally', async () => {
    signIn('SELLER');
    const change = vi.spyOn(authService, 'changePassword');
    renderApp(CHANGE_PASSWORD_PATH);

    fill(es.auth.changePassword.current, 'actual2026x');
    fill(es.auth.changePassword.new, 'corta');
    fill(es.auth.changePassword.confirm, 'otra');
    fireEvent.click(screen.getByRole('button', { name: es.auth.changePassword.submit }));

    expect(await screen.findByText(es.validation.password.policy)).toBeTruthy();
    expect(screen.getByText(es.validation.password.mismatch)).toBeTruthy();
    expect(change).not.toHaveBeenCalled();
  });

  it('hides navigation and the voluntary actions while the change is mandatory', () => {
    signIn('SELLER', { mustChangePassword: true });
    renderApp(CHANGE_PASSWORD_PATH);

    expect(screen.queryByRole('button', { name: es.common.cancel })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(es.userMenu.label) }));
    expect(screen.queryByRole('menuitem', { name: es.userMenu.changePassword })).toBeNull();
    expect(screen.getByRole('menuitem', { name: es.auth.logout })).toBeTruthy();
  });

  it('updates the session and returns home on success', async () => {
    signIn('SELLER', { mustChangePassword: true });
    vi.spyOn(authService, 'changePassword').mockResolvedValue(sessionFixture());
    const router = renderApp(CHANGE_PASSWORD_PATH);

    fill(es.auth.changePassword.current, 'temporal123');
    fill(es.auth.changePassword.new, 'nueva2026xy');
    fill(es.auth.changePassword.confirm, 'nueva2026xy');
    fireEvent.click(screen.getByRole('button', { name: es.auth.changePassword.submit }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(useSessionStore.getState().user?.mustChangePassword).toBe(false);
  });
});

describe('UserMenu', () => {
  it('logs out and goes to the login', async () => {
    signIn('ADMIN');
    const logout = vi.spyOn(authService, 'logout').mockResolvedValue(undefined);
    const router = renderApp('/');

    fireEvent.click(screen.getByRole('button', { name: new RegExp(es.userMenu.label) }));
    expect(screen.getByText(es.enums.Role.ADMIN, { selector: 'p' })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: es.auth.logout }));

    await waitFor(() => expect(router.state.location.pathname).toBe(LOGIN_PATH));
    expect(logout).toHaveBeenCalledOnce();
    expect(useSessionStore.getState().status).toBe('anonymous');
  });
});
