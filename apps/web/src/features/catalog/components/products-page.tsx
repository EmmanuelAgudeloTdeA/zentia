import { ACTIVE_STATUS_FILTERS, SEARCH_MAX_LENGTH, type ProductDto } from '@zentia/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../../../core/auth';
import { errorKey } from '../../../core/errors';
import { formatCop } from '../../../core/format';
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
  FilterChip,
  Pagination,
  PlusIcon,
  SearchIcon,
  TextField,
  toast,
  TrashIcon,
  type DataTableColumn,
} from '../../../shared/ui';
import { useProducts } from '../hooks/use-products';
import { productsService } from '../services/products.service';
import { useProductsFiltersStore } from '../store/products-filters.store';
import { CategorySelect } from './category-select';
import { ProductFormDialog } from './product-form-dialog';

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; product: ProductDto }
  | { kind: 'deactivate'; product: ProductDto }
  | null;

export function ProductsPage() {
  const { t } = useTranslation();
  const isAdmin = useSessionStore((state) => state.user?.role === 'ADMIN');
  const filters = useProductsFiltersStore();
  const { state, reload, refresh, replaceProduct } = useProducts();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const filtered =
    filters.q.trim() !== '' || filters.category !== '' || (isAdmin && filters.status !== 'active');

  const setActive = async (product: ProductDto, isActive: boolean) => {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await productsService.update(product.id, { isActive });
      if (filters.status === 'all') replaceProduct(updated);
      else refresh();
      toast.success(t(isActive ? 'products.toast.activated' : 'products.toast.deactivated'));
      setDialog(null);
    } catch (error) {
      if (isActive) toast.error(t(errorKey(error)));
      else setActionError(error);
    } finally {
      setBusy(false);
    }
  };

  const onSaved = (product: ProductDto, created: boolean) => {
    toast.success(t(created ? 'products.toast.created' : 'products.toast.updated'));
    setDialog(null);
    if (created) refresh();
    else replaceProduct(product);
  };

  const rowActions = (product: ProductDto) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        icon={<EditIcon size={16} />}
        onClick={() => setDialog({ kind: 'edit', product })}
      >
        {t('common.actions.edit')}
      </Button>
      <ActionMenu
        label={t('common.actions.more')}
        items={[
          product.isActive
            ? {
                key: 'deactivate',
                label: t('common.actions.deactivate'),
                icon: <TrashIcon size={16} />,
                tone: 'danger',
                onSelect: () => setDialog({ kind: 'deactivate', product }),
              }
            : {
                key: 'activate',
                label: t('common.actions.activate'),
                icon: <CheckCircleIcon size={16} />,
                onSelect: () => void setActive(product, true),
              },
        ]}
      />
    </div>
  );

  const statusBadge = (product: ProductDto) =>
    product.isActive ? (
      <Badge tone="success">{t('common.status.active')}</Badge>
    ) : (
      <Badge tone="neutral">{t('common.status.inactive')}</Badge>
    );

  const columns: DataTableColumn<ProductDto>[] = [
    {
      key: 'name',
      header: t('products.fields.name'),
      cell: (product) => <span className="font-medium text-neutral-900">{product.name}</span>,
    },
    { key: 'category', header: t('products.fields.category'), cell: (product) => product.category },
    {
      key: 'price',
      header: t('products.fields.price'),
      cell: (product) => formatCop(product.price),
      align: 'right',
    },
    {
      key: 'vatRate',
      header: t('products.fields.vatRate'),
      cell: (product) => t(`enums.VatRate.${product.vatRate}`),
      align: 'right',
    },
    ...(isAdmin
      ? ([
          { key: 'status', header: t('products.fields.status'), cell: statusBadge },
          {
            key: 'actions',
            header: <span className="sr-only">{t('common.actions.more')}</span>,
            cell: rowActions,
            align: 'right',
          },
        ] satisfies DataTableColumn<ProductDto>[])
      : []),
  ];

  const mobileCard = (product: ProductDto) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-neutral-900">{product.name}</p>
          <p className="truncate text-body-sm text-neutral-500">{product.category}</p>
        </div>
        {isAdmin ? statusBadge(product) : null}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-body font-semibold tabular-nums">
          {formatCop(product.price)}
          <span className="ml-2 text-body-sm font-normal text-neutral-500">
            {t(`enums.VatRate.${product.vatRate}`)}
          </span>
        </span>
        {isAdmin ? rowActions(product) : null}
      </div>
    </div>
  );

  const emptyState = filtered ? (
    <EmptyState
      icon={<SearchIcon size={40} />}
      title={t('products.empty.filteredTitle')}
      action={
        <Button variant="secondary" onClick={filters.reset}>
          {t('common.actions.clearFilters')}
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={<SearchIcon size={40} />}
      title={isAdmin ? t('products.empty.adminTitle') : t('products.empty.title')}
      action={
        isAdmin ? (
          <Button icon={<PlusIcon size={16} />} onClick={() => setDialog({ kind: 'create' })}>
            {t('products.new')}
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <>
      <PageHeader
        title={t('products.title')}
        description={t('products.description')}
        actions={
          isAdmin ? (
            <Button
              variant="on-dark"
              icon={<PlusIcon size={16} />}
              onClick={() => setDialog({ kind: 'create' })}
            >
              {t('products.new')}
            </Button>
          ) : undefined
        }
      />

      <section className="rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm">
        <div className="space-y-3 border-b border-neutral-200 p-4">
          {isAdmin ? (
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
          ) : null}
          <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
            <TextField
              label={t('products.search')}
              type="search"
              maxLength={SEARCH_MAX_LENGTH}
              value={filters.q}
              onChange={(event) => filters.setQ(event.target.value)}
              endAdornment={<SearchIcon size={16} className="mr-2 text-neutral-400" />}
            />
            <CategorySelect
              label={t('products.fields.category')}
              allLabel={t('products.category.filterPlaceholder')}
              value={filters.category}
              onChange={filters.selectCategory}
            />
          </div>
        </div>

        {state.status === 'error' ? (
          <div className="p-4">
            <ErrorMessage error={state.error} onRetry={reload} />
          </div>
        ) : (
          <DataTable
            caption={t('products.tableCaption')}
            columns={columns}
            rows={state.status === 'ready' ? state.data.items : []}
            rowKey={(product) => product.id}
            loading={state.status === 'loading'}
            skeletonRows={8}
            mobileCard={mobileCard}
            empty={emptyState}
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
        <ProductFormDialog
          onClose={() => setDialog(null)}
          onSaved={(product) => onSaved(product, true)}
        />
      ) : null}
      {dialog?.kind === 'edit' ? (
        <ProductFormDialog
          product={dialog.product}
          onClose={() => setDialog(null)}
          onSaved={(product) => onSaved(product, false)}
        />
      ) : null}
      {dialog?.kind === 'deactivate' ? (
        <ConfirmDialog
          title={t('products.confirm.deactivateTitle', { name: dialog.product.name })}
          description={t('products.confirm.deactivate', { name: dialog.product.name })}
          confirmLabel={t('common.actions.deactivate')}
          cancelLabel={t('common.cancel')}
          loading={busy}
          error={actionError ? <Alert tone="danger">{t(errorKey(actionError))}</Alert> : null}
          onConfirm={() => void setActive(dialog.product, false)}
          onCancel={() => {
            setDialog(null);
            setActionError(null);
          }}
        />
      ) : null}
    </>
  );
}
