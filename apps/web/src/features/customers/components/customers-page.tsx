import {
  ACTIVE_STATUS_FILTERS,
  formatPhoneForDisplay,
  SEARCH_MAX_LENGTH,
  type CustomerDto,
} from '@zentia/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { PageHeader } from '../../../core/layout';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorMessage,
  EyeIcon,
  FilterChip,
  Pagination,
  PlusIcon,
  RowActionLink,
  SearchIcon,
  TextField,
  toast,
  UsersIcon,
  type DataTableColumn,
} from '../../../shared/ui';
import { useCustomers } from '../hooks/use-customers';
import { useCustomersFiltersStore } from '../store/customers-filters.store';
import { CustomerFormDialog } from './customer-form-dialog';
import { CustomerStatusBadge } from './customer-status-badge';

export const customerPath = (id: string) => `/customers/${id}`;

export function CustomersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const filters = useCustomersFiltersStore();
  const { state, reload } = useCustomers();
  const [creating, setCreating] = useState(false);
  const filtered = filters.q.trim() !== '' || filters.status !== 'active';

  const contact = (customer: CustomerDto) =>
    customer.phone ? formatPhoneForDisplay(customer.phone) : (customer.email ?? '');

  const nameLink = (customer: CustomerDto) => (
    <Link
      to={customerPath(customer.id)}
      className="font-medium text-neutral-900 hover:text-primary-600 hover:underline"
    >
      {customer.name}
    </Link>
  );

  const columns: DataTableColumn<CustomerDto>[] = [
    { key: 'name', header: t('customers.fields.name'), cell: nameLink },
    {
      key: 'documentId',
      header: t('customers.fields.documentId'),
      cell: (customer) => <span className="font-mono text-body-sm">{customer.documentId}</span>,
    },
    {
      key: 'phone',
      header: t('customers.fields.phone'),
      cell: (customer) => (customer.phone ? formatPhoneForDisplay(customer.phone) : '—'),
      secondary: true,
    },
    {
      key: 'email',
      header: t('customers.fields.email'),
      cell: (customer) => <span className="text-neutral-600">{customer.email ?? '—'}</span>,
      secondary: true,
    },
    {
      key: 'status',
      header: t('customers.fields.status'),
      cell: (customer) => <CustomerStatusBadge active={customer.isActive} />,
    },
  ];

  const mobileCard = (customer: CustomerDto) => (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        <p className="truncate">{nameLink(customer)}</p>
        <p className="font-mono text-body-sm text-neutral-600">{customer.documentId}</p>
        <p className="truncate text-body-sm text-neutral-500">{contact(customer)}</p>
      </div>
      <CustomerStatusBadge active={customer.isActive} />
    </div>
  );

  return (
    <>
      <PageHeader
        title={t('customers.title')}
        description={t('customers.description')}
        actions={
          <Button variant="on-dark" icon={<PlusIcon size={16} />} onClick={() => setCreating(true)}>
            {t('customers.new')}
          </Button>
        }
      />

      <section className="rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div
            role="group"
            aria-label={t('common.statusFilter.label')}
            className="flex gap-2 overflow-x-auto"
          >
            {ACTIVE_STATUS_FILTERS.map((status) => (
              <FilterChip
                key={status}
                active={filters.status === status}
                onClick={() => filters.setStatus(status)}
              >
                {t(`common.statusFilter.${status}`)}
              </FilterChip>
            ))}
          </div>
          <TextField
            label={t('customers.search')}
            type="search"
            className="lg:w-96"
            maxLength={SEARCH_MAX_LENGTH}
            value={filters.q}
            onChange={(event) => filters.setQ(event.target.value)}
            endAdornment={<SearchIcon size={16} className="mr-2 text-neutral-400" />}
          />
        </div>

        {state.status === 'error' ? (
          <div className="p-4">
            <ErrorMessage error={state.error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            caption={t('customers.tableCaption')}
            columns={columns}
            rows={state.status === 'ready' ? state.data.items : []}
            rowKey={(customer) => customer.id}
            onRowClick={(customer) => navigate(customerPath(customer.id))}
            actionsHeader={t('common.actions.rowActions')}
            rowActions={(customer) => (
              <RowActionLink
                to={customerPath(customer.id)}
                label={t('common.actions.viewDetail')}
                icon={<EyeIcon size={16} />}
              />
            )}
            loading={state.status === 'loading'}
            skeletonRows={8}
            mobileCard={mobileCard}
            empty={
              filtered ? (
                <EmptyState
                  icon={<SearchIcon size={40} />}
                  title={t('customers.empty.filteredTitle')}
                  action={
                    <Button variant="secondary" onClick={filters.reset}>
                      {t('common.actions.clearFilters')}
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<UsersIcon size={40} />}
                  title={t('customers.empty.title')}
                  action={
                    <Button icon={<PlusIcon size={16} />} onClick={() => setCreating(true)}>
                      {t('customers.new')}
                    </Button>
                  }
                />
              )
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

      {creating ? (
        <CustomerFormDialog
          onClose={() => setCreating(false)}
          onSaved={(customer) => {
            toast.success(t('customers.toast.created'));
            navigate(customerPath(customer.id));
          }}
          onOpenExisting={(id) => navigate(customerPath(id))}
        />
      ) : null}
    </>
  );
}
