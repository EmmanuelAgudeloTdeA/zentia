import { ROLES, type CreateUserResult, type Role, type UserDto } from '@zentia/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../../core/auth';
import { errorKey } from '../../../core/errors';
import { PageHeader } from '../../../core/layout';
import {
  ActionMenu,
  Alert,
  Badge,
  Button,
  CheckCircleIcon,
  ConfirmDialog,
  DataTable,
  EditIcon,
  EmptyState,
  ErrorMessage,
  KeyIcon,
  Pagination,
  PlusIcon,
  SearchIcon,
  Select,
  TextField,
  toast,
  UserOffIcon,
  UsersIcon,
  type ActionMenuItem,
  type DataTableColumn,
} from '../../../shared/ui';
import { useUsers } from '../hooks/use-users';
import { usersService } from '../services/users.service';
import {
  hasActiveFilters,
  useUsersFiltersStore,
  type UserStatusFilter,
} from '../store/users-filters.store';
import { TemporaryPasswordDialog } from './temporary-password-dialog';
import { UserFormDialog } from './user-form-dialog';

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; user: UserDto }
  | { kind: 'deactivate'; user: UserDto }
  | { kind: 'reset'; user: UserDto }
  | { kind: 'temporary'; email: string; password: string }
  | null;

function StatusBadge({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return active ? (
    <Badge tone="success" icon={<CheckCircleIcon size={14} />}>
      {t('users.status.active')}
    </Badge>
  ) : (
    <Badge tone="neutral" icon={<UserOffIcon size={14} />}>
      {t('users.status.inactive')}
    </Badge>
  );
}

export function UsersPage() {
  const { t } = useTranslation();
  const currentUserId = useSessionStore((state) => state.user?.id);
  const filters = useUsersFiltersStore();
  const { state, reload, refresh, replaceUser } = useUsers();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);

  const closeDialog = () => {
    setDialog(null);
    setActionError(null);
  };

  const setActive = async (user: UserDto, isActive: boolean) => {
    setBusy(true);
    setActionError(null);
    try {
      replaceUser(await usersService.update(user.id, { isActive }));
      toast.success(t(isActive ? 'users.toast.activated' : 'users.toast.deactivated'));
      setDialog(null);
    } catch (error) {
      if (isActive) toast.error(t(errorKey(error)));
      else setActionError(error);
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (user: UserDto) => {
    setBusy(true);
    setActionError(null);
    try {
      const { temporaryPassword } = await usersService.resetPassword(user.id);
      toast.success(t('users.toast.passwordReset', { name: user.name }));
      setDialog({ kind: 'temporary', email: user.email, password: temporaryPassword });
    } catch (error) {
      setActionError(error);
    } finally {
      setBusy(false);
    }
  };

  const onCreated = ({ user, temporaryPassword }: CreateUserResult) => {
    toast.success(t('users.toast.created', { name: user.name }));
    setDialog({ kind: 'temporary', email: user.email, password: temporaryPassword });
    refresh();
  };

  const onUpdated = (user: UserDto) => {
    replaceUser(user);
    toast.success(t('users.toast.updated'));
    setDialog(null);
  };

  const menuItems = (user: UserDto): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [];
    if (!user.isActive) {
      items.push({
        key: 'activate',
        label: t('users.actions.activate'),
        icon: <CheckCircleIcon size={16} />,
        onSelect: () => void setActive(user, true),
      });
    } else if (user.id !== currentUserId) {
      items.push({
        key: 'deactivate',
        label: t('users.actions.deactivate'),
        icon: <UserOffIcon size={16} />,
        tone: 'danger',
        onSelect: () => setDialog({ kind: 'deactivate', user }),
      });
    }
    items.push({
      key: 'reset',
      label: t('users.actions.resetPassword'),
      icon: <KeyIcon size={16} />,
      onSelect: () => setDialog({ kind: 'reset', user }),
    });
    return items;
  };

  const rowActions = (user: UserDto) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        icon={<EditIcon size={16} />}
        onClick={() => setDialog({ kind: 'edit', user })}
      >
        {t('users.actions.edit')}
      </Button>
      <ActionMenu label={t('users.columns.actions')} items={menuItems(user)} />
    </div>
  );

  const nameCell = (user: UserDto) => (
    <span className="font-medium text-neutral-900">
      {user.name}
      {user.id === currentUserId ? (
        <span className="ml-2 text-caption text-neutral-500">({t('users.you')})</span>
      ) : null}
    </span>
  );

  const columns: DataTableColumn<UserDto>[] = [
    { key: 'name', header: t('users.columns.name'), cell: nameCell },
    {
      key: 'email',
      header: t('users.columns.email'),
      cell: (user) => <span className="text-neutral-600">{user.email}</span>,
      secondary: true,
    },
    { key: 'role', header: t('users.columns.role'), cell: (user) => t(`enums.Role.${user.role}`) },
    {
      key: 'status',
      header: t('users.columns.status'),
      cell: (user) => <StatusBadge active={user.isActive} />,
    },
    {
      key: 'actions',
      header: <span className="sr-only">{t('users.columns.actions')}</span>,
      cell: rowActions,
      align: 'right',
    },
  ];

  const mobileCard = (user: UserDto) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate">{nameCell(user)}</p>
          <p className="truncate text-body-sm text-neutral-500">{user.email}</p>
        </div>
        <StatusBadge active={user.isActive} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-body-sm text-neutral-700">{t(`enums.Role.${user.role}`)}</span>
        {rowActions(user)}
      </div>
    </div>
  );

  const roleOptions = [
    { value: '', label: t('users.filters.all') },
    ...ROLES.map((role) => ({ value: role, label: t(`enums.Role.${role}`) })),
  ];
  const statusOptions = [
    { value: '', label: t('users.filters.all') },
    { value: 'active', label: t('users.status.active') },
    { value: 'inactive', label: t('users.status.inactive') },
  ];

  return (
    <>
      <PageHeader
        title={t('users.title')}
        description={t('users.description')}
        actions={
          <Button
            variant="on-dark"
            icon={<PlusIcon size={16} />}
            onClick={() => setDialog({ kind: 'create' })}
          >
            {t('users.new')}
          </Button>
        }
      />

      <section className="rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm">
        <div className="grid gap-3 border-b border-neutral-200 p-4 sm:grid-cols-[1fr_12rem_12rem]">
          <TextField
            label={t('users.filters.search')}
            type="search"
            value={filters.q}
            onChange={(event) => filters.setQ(event.target.value)}
            endAdornment={<SearchIcon size={16} className="text-neutral-400" />}
          />
          <Select
            label={t('users.filters.role')}
            options={roleOptions}
            value={filters.role}
            onChange={(event) => filters.setRole(event.target.value as Role | '')}
          />
          <Select
            label={t('users.filters.status')}
            options={statusOptions}
            value={filters.status}
            onChange={(event) => filters.setStatus(event.target.value as UserStatusFilter)}
          />
        </div>

        {state.status === 'error' ? (
          <div className="p-4">
            <ErrorMessage error={state.error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            caption={t('users.tableCaption')}
            columns={columns}
            rows={state.status === 'ready' ? state.data.items : []}
            rowKey={(user) => user.id}
            loading={state.status === 'loading'}
            mobileCard={mobileCard}
            empty={
              <EmptyState
                icon={<UsersIcon size={40} />}
                title={t('users.empty.title')}
                description={t('users.empty.description')}
                action={
                  hasActiveFilters(filters) ? (
                    <Button variant="secondary" onClick={filters.reset}>
                      {t('users.filters.clear')}
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        )}

        {state.status === 'ready' ? (
          <Pagination
            page={state.data.page}
            pageSize={state.data.pageSize}
            total={state.data.total}
            onPageChange={filters.setPage}
            summary={(range) => t('common.pagination', range)}
            previousLabel={t('common.previousPage')}
            nextLabel={t('common.nextPage')}
          />
        ) : null}
      </section>

      {dialog?.kind === 'create' ? (
        <UserFormDialog
          mode="create"
          currentUserId={currentUserId}
          onClose={closeDialog}
          onCreated={onCreated}
        />
      ) : null}
      {dialog?.kind === 'edit' ? (
        <UserFormDialog
          mode="edit"
          user={dialog.user}
          currentUserId={currentUserId}
          onClose={closeDialog}
          onUpdated={onUpdated}
        />
      ) : null}
      {dialog?.kind === 'deactivate' ? (
        <ConfirmDialog
          title={t('users.confirm.deactivateTitle', { name: dialog.user.name })}
          description={t('users.confirm.deactivate', { name: dialog.user.name })}
          confirmLabel={t('users.actions.deactivate')}
          cancelLabel={t('common.cancel')}
          loading={busy}
          error={actionError ? <Alert tone="danger">{t(errorKey(actionError))}</Alert> : null}
          onConfirm={() => void setActive(dialog.user, false)}
          onCancel={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'reset' ? (
        <ConfirmDialog
          title={t('users.confirm.resetPasswordTitle', { name: dialog.user.name })}
          description={t('users.confirm.resetPassword')}
          confirmLabel={t('users.confirm.reset')}
          cancelLabel={t('common.cancel')}
          loading={busy}
          error={actionError ? <Alert tone="danger">{t(errorKey(actionError))}</Alert> : null}
          onConfirm={() => void resetPassword(dialog.user)}
          onCancel={closeDialog}
        />
      ) : null}
      {dialog?.kind === 'temporary' ? (
        <TemporaryPasswordDialog
          email={dialog.email}
          password={dialog.password}
          onClose={closeDialog}
        />
      ) : null}
    </>
  );
}
