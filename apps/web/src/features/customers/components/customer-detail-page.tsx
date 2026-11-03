import { formatPhoneForDisplay, type CustomerDto } from '@zentia/shared';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { errorKey, isApiError } from '../../../core/errors';
import { formatDate } from '../../../core/format';
import { PageHeader } from '../../../core/layout';
import {
  Alert,
  Button,
  CheckCircleIcon,
  ConfirmDialog,
  EditIcon,
  EmptyState,
  ErrorMessage,
  SectionCard,
  Skeleton,
  toast,
  UserOffIcon,
  UsersIcon,
} from '../../../shared/ui';
import { useCustomer } from '../hooks/use-customer';
import { customersService } from '../services/customers.service';
import { CustomerFormDialog } from './customer-form-dialog';
import { customerPath } from './customers-page';
import { CustomerStatusBadge } from './customer-status-badge';

const CUSTOMERS_PATH = '/customers';

function DataItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-overline text-neutral-500 uppercase">{label}</dt>
      <dd className="mt-1 text-body text-neutral-900">{children}</dd>
    </div>
  );
}

export function CustomerDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { state, reload, replace } = useCustomer(id);
  const [dialog, setDialog] = useState<'edit' | 'deactivate' | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);

  if (state.status === 'loading') {
    return (
      <div className="space-y-5" aria-busy="true">
        <PageHeader title={<Skeleton className="h-8 w-64 bg-white/20" />} backTo={CUSTOMERS_PATH} />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }

  if (state.status === 'error') {
    const notFound = isApiError(state.error) && state.error.code === 'CUSTOMER_NOT_FOUND';
    return (
      <>
        <PageHeader title={t('customers.title')} backTo={CUSTOMERS_PATH} />
        {notFound ? (
          <EmptyState
            icon={<UsersIcon size={40} />}
            title={t('customers.detail.notFound')}
            action={
              <Link to={CUSTOMERS_PATH} className="text-primary-600 hover:underline">
                {t('customers.detail.backToList')}
              </Link>
            }
          />
        ) : (
          <ErrorMessage error={state.error} onRetry={() => void reload()} />
        )}
      </>
    );
  }

  const customer = state.customer;

  const setActive = async (isActive: boolean) => {
    setBusy(true);
    setActionError(null);
    try {
      replace(await customersService.update(customer.id, { isActive }));
      toast.success(t(isActive ? 'customers.toast.activated' : 'customers.toast.deactivated'));
      setDialog(null);
    } catch (error) {
      if (isActive) toast.error(t(errorKey(error)));
      else setActionError(error);
    } finally {
      setBusy(false);
    }
  };

  const onSaved = (updated: CustomerDto) => {
    replace(updated);
    toast.success(t('customers.toast.updated'));
    setDialog(null);
  };

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {customer.name}
            {customer.isActive ? null : <CustomerStatusBadge active={false} />}
          </span>
        }
        backTo={CUSTOMERS_PATH}
        actions={
          <>
            <Button
              variant="on-dark"
              icon={<EditIcon size={16} />}
              onClick={() => setDialog('edit')}
            >
              {t('common.actions.edit')}
            </Button>
            {customer.isActive ? (
              <Button
                variant="danger-outline"
                icon={<UserOffIcon size={16} />}
                onClick={() => setDialog('deactivate')}
              >
                {t('common.actions.deactivate')}
              </Button>
            ) : (
              <Button
                variant="on-dark"
                icon={<CheckCircleIcon size={16} />}
                loading={busy}
                onClick={() => void setActive(true)}
              >
                {t('common.actions.activate')}
              </Button>
            )}
          </>
        }
      />

      <SectionCard title={t('customers.detail.data')}>
        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DataItem label={t('customers.fields.documentId')}>
            <span className="font-mono">{customer.documentId}</span>
          </DataItem>
          <DataItem label={t('customers.fields.phone')}>
            {customer.phone ? formatPhoneForDisplay(customer.phone) : '—'}
          </DataItem>
          <DataItem label={t('customers.fields.email')}>{customer.email ?? '—'}</DataItem>
          <DataItem label={t('customers.fields.createdBy')}>{customer.createdBy.name}</DataItem>
          <DataItem label={t('customers.fields.createdAt')}>
            {formatDate(customer.createdAt)}
          </DataItem>
        </dl>
      </SectionCard>

      {dialog === 'edit' ? (
        <CustomerFormDialog
          customer={customer}
          onClose={() => setDialog(null)}
          onSaved={onSaved}
          onOpenExisting={(existingId) => {
            setDialog(null);
            navigate(customerPath(existingId));
          }}
        />
      ) : null}
      {dialog === 'deactivate' ? (
        <ConfirmDialog
          title={t('customers.confirm.deactivateTitle', { name: customer.name })}
          description={t('customers.confirm.deactivate', { name: customer.name })}
          confirmLabel={t('common.actions.deactivate')}
          cancelLabel={t('common.cancel')}
          loading={busy}
          error={actionError ? <Alert tone="danger">{t(errorKey(actionError))}</Alert> : null}
          onConfirm={() => void setActive(false)}
          onCancel={() => {
            setDialog(null);
            setActionError(null);
          }}
        />
      ) : null}
    </>
  );
}
