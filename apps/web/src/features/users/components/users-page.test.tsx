import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { UserDto } from '@zentia/shared';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../core/errors';
import { PrivateLayout } from '../../../core/layout';
import es from '../../../lang/es.json';
import { signIn, userFixture } from '../../../test/session-fixture';
import { usersService } from '../services/users.service';
import { useUsersFiltersStore } from '../store/users-filters.store';
import { UsersPage } from './users-page';

const ADMIN_ID = '7b0f5c4e-0d5a-4a43-9d8a-6b8f2f3b1c11';

const admin = userFixture({
  id: ADMIN_ID,
  name: 'Admin Uno',
  email: 'admin@empresa.co',
  role: 'ADMIN',
});
const seller = userFixture({
  id: '0c6f2d6e-6a8f-4e1b-9f5a-2b8f3b1c1a22',
  name: 'Beto Ruiz',
  email: 'beto@empresa.co',
});
const inactive = userFixture({
  id: '1d7a3e7f-7b9a-4f2c-8a6b-3c9a4c2d2b33',
  name: 'Carla Díaz',
  email: 'carla@empresa.co',
  isActive: false,
});

function mockList(items: UserDto[]) {
  return vi
    .spyOn(usersService, 'list')
    .mockResolvedValue({ items, total: items.length, page: 1, pageSize: 20 });
}

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        element: <PrivateLayout navItems={[]} />,
        children: [{ path: '/users', element: <UsersPage /> }],
      },
    ],
    { initialEntries: ['/users'] },
  );
  render(<RouterProvider router={router} />);
}

async function findRow(name: string): Promise<HTMLElement> {
  const table = await screen.findByRole('table');
  return within(table).findByText(name);
}

function rowOf(name: string): HTMLElement {
  const row = within(screen.getByRole('table')).getByText(name).closest('tr');
  if (!row) throw new Error(`Row ${name} not found`);
  return row;
}

async function openMenu(name: string) {
  fireEvent.click(within(rowOf(name)).getByRole('button', { name: es.users.columns.actions }));
  return screen.findByRole('menu');
}

beforeEach(() => {
  signIn('ADMIN', { id: ADMIN_ID, name: admin.name, email: admin.email });
});

afterEach(() => {
  vi.restoreAllMocks();
  useUsersFiltersStore.getState().reset();
});

describe('UsersPage', () => {
  it('lists users with translated role and status', async () => {
    mockList([admin, seller, inactive]);
    renderPage();

    expect(await findRow('Beto Ruiz')).toBeTruthy();
    expect(within(rowOf('Beto Ruiz')).getByText(es.enums.Role.SELLER)).toBeTruthy();
    expect(within(rowOf('Carla Díaz')).getByText(es.users.status.inactive)).toBeTruthy();
    expect(within(rowOf('Admin Uno')).getByText(`(${es.users.you})`)).toBeTruthy();
  });

  it('offers deactivate for others, activate for inactive users and never deactivate on the own row', async () => {
    mockList([admin, seller, inactive]);
    renderPage();
    await findRow('Beto Ruiz');

    let menu = await openMenu('Admin Uno');
    expect(within(menu).queryByText(es.users.actions.deactivate)).toBeNull();
    expect(within(menu).getByText(es.users.actions.resetPassword)).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });

    menu = await openMenu('Beto Ruiz');
    expect(within(menu).getByText(es.users.actions.deactivate)).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });

    menu = await openMenu('Carla Díaz');
    expect(within(menu).getByText(es.users.actions.activate)).toBeTruthy();
  });

  it('creates a user and shows the temporary password once', async () => {
    mockList([admin]);
    const create = vi.spyOn(usersService, 'create').mockResolvedValue({
      user: seller,
      temporaryPassword: 'Xk7pQ2mN9wRt',
    });
    renderPage();
    await findRow('Admin Uno');

    fireEvent.click(screen.getByRole('button', { name: es.users.new }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${es.users.form.name}`)), {
      target: { value: 'Beto Ruiz' },
    });
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${es.users.form.email}`)), {
      target: { value: 'Beto@Empresa.co' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.users.form.create }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        name: 'Beto Ruiz',
        email: 'beto@empresa.co',
        role: 'SELLER',
      }),
    );
    expect((await screen.findByTestId('temporary-password')).textContent).toBe('Xk7pQ2mN9wRt');
    expect(screen.getByText(es.users.temporaryPassword.notice)).toBeTruthy();
  });

  it('shows EMAIL_TAKEN on the email field', async () => {
    mockList([admin]);
    vi.spyOn(usersService, 'create').mockRejectedValue(new ApiError('EMAIL_TAKEN', 409));
    renderPage();
    await findRow('Admin Uno');

    fireEvent.click(screen.getByRole('button', { name: es.users.new }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${es.users.form.name}`)), {
      target: { value: 'Otra' },
    });
    fireEvent.change(within(dialog).getByLabelText(new RegExp(`^${es.users.form.email}`)), {
      target: { value: 'admin@empresa.co' },
    });
    fireEvent.click(screen.getByRole('button', { name: es.users.form.create }));

    expect(await within(dialog).findByText(es.errors.EMAIL_TAKEN)).toBeTruthy();
  });

  it('makes role and status read-only when editing oneself', async () => {
    mockList([admin]);
    renderPage();
    await findRow('Admin Uno');

    fireEvent.click(
      within(rowOf('Admin Uno')).getByRole('button', { name: es.users.actions.edit }),
    );
    const dialog = await screen.findByRole('dialog');

    expect(
      (within(dialog).getByLabelText(new RegExp(`^${es.users.form.role}`)) as HTMLSelectElement)
        .disabled,
    ).toBe(true);
    expect(within(dialog).getAllByText(es.users.form.selfReadonlyHint).length).toBeGreaterThan(0);
  });

  it('shows LAST_ADMIN inside the deactivate confirmation', async () => {
    mockList([admin, seller]);
    vi.spyOn(usersService, 'update').mockRejectedValue(new ApiError('LAST_ADMIN', 409));
    renderPage();
    await findRow('Beto Ruiz');

    const menu = await openMenu('Beto Ruiz');
    fireEvent.click(within(menu).getByText(es.users.actions.deactivate));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: es.users.actions.deactivate }));

    expect(await within(dialog).findByText(es.errors.LAST_ADMIN)).toBeTruthy();
  });
});
