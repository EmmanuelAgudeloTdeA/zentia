import {
  calculateQuoteTotals,
  Decimal,
  percentString,
  QUOTE_MAX_ITEMS,
  quantityString,
  quoteTotalsToStrings,
  type CustomerDto,
  type ProductDto,
  type QuoteDto,
  type VatRate,
} from '@zentia/shared';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useSessionStore } from '../../../core/auth';
import { isApiError } from '../../../core/errors';
import { formatCop, formatPercent, formatQuantity } from '../../../core/format';
import { PageHeader } from '../../../core/layout';
import {
  Alert,
  Button,
  Combobox,
  ConfirmDialog,
  MoneyField,
  NumberField,
  SectionCard,
  toast,
  TotalsSummary,
  TrashIcon,
} from '../../../shared/ui';
import { productsService } from '../../catalog';
import { customersService } from '../../customers';
import { useCommercialParameters } from '../hooks/use-commercial-parameters';
import { quotesService } from '../services/quotes.service';
import { CustomerRequestDialog } from './customer-request-dialog';
import { errorText } from './quote-format';
import { quotePath, QUOTES_PATH } from './quote-paths';
import { QuoteStatusBadge } from './quote-status-badge';

interface EditorLine {
  key: string;
  id?: string;
  productId: string;
  productName: string;
  category: string;
  unitPrice: string;
  vatRate: VatRate;
  quantity: string;
}

interface EditorCustomer {
  id: string;
  name: string;
  documentId: string;
  isActive: boolean;
}

export interface DuplicateNotice {
  number: string;
  omittedNames: string[];
  discountReset: boolean;
}

interface QuoteEditorProps {
  quote?: QuoteDto;
  notice?: DuplicateNotice | undefined;
  onReload?: () => void;
}

let lineSeq = 0;
const lineKey = () => `line-${++lineSeq}`;

const isValidQuantity = (value: string) => quantityString.safeParse(value).success;
const isValidPercent = (value: string) => percentString.safeParse(value || '0').success;

export function QuoteEditor({ quote, notice, onReload }: QuoteEditorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const role = useSessionStore((state) => state.user?.role) ?? 'SELLER';
  const params = useCommercialParameters();

  const initial = useRef({
    customer: quote ? quote.customer : null,
    lines: (quote?.items ?? []).map((item) => ({
      key: lineKey(),
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      category: item.category,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      quantity: item.quantity,
    })),
    discountPct: quote?.discountPct ?? '0',
    shippingAmount: quote?.shippingAmount ?? '0',
  });
  const [customer, setCustomer] = useState<EditorCustomer | null>(initial.current.customer);
  const [customerInput, setCustomerInput] = useState(quote?.customer.name ?? '');
  const [lines, setLines] = useState<EditorLine[]>(initial.current.lines);
  const [productInput, setProductInput] = useState('');
  const [discountPct, setDiscountPct] = useState(initial.current.discountPct);
  const [shippingAmount, setShippingAmount] = useState(initial.current.shippingAmount);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<unknown>(null);
  const [askRequest, setAskRequest] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const sent = quote?.status === 'SENT';
  // Una cotización nueva toma el IVA del envío de los parámetros: sin ellos, la vista previa no es confiable.
  const parametersFailed = !quote && params.error !== null;
  const shippingTaxable = quote?.shippingTaxable ?? params.shippingTaxable;
  const myLimit = params.discountLimits[role];
  const sellerLimit = params.discountLimits.SELLER;
  const originalDiscount = initial.current.discountPct;
  const discountValue = discountPct || '0';
  const discountValid = isValidPercent(discountValue);
  const discountChanged = discountValid && !new Decimal(discountValue).eq(originalDiscount);
  const discountLocked = role === 'SELLER' && new Decimal(originalDiscount).gt(sellerLimit);
  const discountExceeded = discountChanged && new Decimal(discountValue).gt(myLimit);
  const showOverride =
    role !== 'SELLER' &&
    discountValid &&
    !discountExceeded &&
    new Decimal(discountValue).gt(sellerLimit);

  const totals = useMemo(
    () =>
      quoteTotalsToStrings(
        calculateQuoteTotals({
          items: lines.map((line) => ({
            unitPrice: line.unitPrice,
            vatRate: line.vatRate,
            quantity: isValidQuantity(line.quantity) ? line.quantity : '0',
          })),
          discountPct: discountValid ? discountValue : '0',
          shippingAmount: shippingAmount || '0',
          shippingTaxable,
        }),
      ),
    [lines, discountValid, discountValue, shippingAmount, shippingTaxable],
  );

  const dirty =
    customer?.id !== initial.current.customer?.id ||
    discountValue !== initial.current.discountPct ||
    (shippingAmount || '0') !== initial.current.shippingAmount ||
    JSON.stringify(lines.map((line) => [line.productId, line.quantity])) !==
      JSON.stringify(initial.current.lines.map((line) => [line.productId, line.quantity]));

  const errors = {
    customer: !customer ? t('quotes.editor.customerRequired') : undefined,
    lines: lines.length === 0 ? t('quotes.editor.linesRequired') : undefined,
    discount: !discountValid
      ? t('quotes.editor.discountInvalid')
      : discountExceeded
        ? t('quotes.editor.discountExceeded', { limit: formatPercent(myLimit) })
        : undefined,
  };
  const quantitiesValid = lines.every((line) => isValidQuantity(line.quantity));
  const customerBlocked = !sent && customer !== null && !customer.isActive;

  const addProduct = (product: ProductDto) => {
    setLines((current) => [
      ...current,
      {
        key: lineKey(),
        productId: product.id,
        productName: product.name,
        category: product.category,
        unitPrice: product.price,
        vatRate: product.vatRate,
        quantity: '1',
      },
    ]);
    setProductInput('');
  };

  const payloadItems = () =>
    lines.map((line) => ({
      ...(line.id ? { id: line.id } : {}),
      productId: line.productId,
      quantity: line.quantity,
    }));

  const handleError = (error: unknown) => {
    setServerError(error);
    setAskRequest(false);
  };

  const save = async (customerRequest?: string) => {
    setSaving(true);
    setServerError(null);
    try {
      if (!quote) {
        const created = await quotesService.create({
          customerId: customer?.id ?? '',
          items: payloadItems().map(({ productId, quantity }) => ({ productId, quantity })),
          discountPct: discountValue,
          shippingAmount: shippingAmount || '0',
        });
        toast.success(t('quotes.toast.saved', { number: created.displayNumber }));
        navigate(quotePath(created.id));
        return;
      }
      const result = await quotesService.update(quote.id, {
        ...(sent ? { customerRequest } : { customerId: customer?.id }),
        items: payloadItems(),
        discountPct: discountValue,
        shippingAmount: shippingAmount || '0',
        updatedAt: quote.updatedAt,
      });
      if (sent && !result.changed) toast.info(t('quotes.toast.noChanges'));
      else if (result.versionNumber)
        toast.success(t('quotes.toast.versionSaved', { version: result.versionNumber }));
      else toast.success(t('quotes.toast.saved', { number: result.quote.displayNumber }));
      navigate(quotePath(quote.id));
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  };

  const submit = () => {
    setSubmitted(true);
    if (parametersFailed) return;
    if (errors.customer || errors.lines || errors.discount || !quantitiesValid || customerBlocked)
      return;
    if (sent && quote && !dirty) {
      toast.info(t('quotes.toast.noChanges'));
      navigate(quotePath(quote.id));
      return;
    }
    if (sent) setAskRequest(true);
    else void save();
  };

  const cancel = () =>
    dirty ? setConfirmDiscard(true) : navigate(quote ? quotePath(quote.id) : QUOTES_PATH);
  const conflict = isApiError(serverError) && serverError.code === 'QUOTE_CONFLICT';
  const comboboxLabels = {
    loading: t('common.combobox.loading'),
    noResults: t('common.combobox.noResults'),
    error: t('common.combobox.error'),
  };

  const totalsRows = [
    { key: 'subtotal', label: t('quotes.totals.subtotal'), value: formatCop(totals.subtotal) },
    {
      key: 'discount',
      label: t('quotes.totals.discount', {
        pct: formatPercent(discountValid ? discountValue : '0'),
      }),
      value: `− ${formatCop(totals.discountAmount)}`,
    },
    { key: 'linesVat', label: t('quotes.totals.linesVat'), value: formatCop(totals.linesVat) },
    {
      key: 'shipping',
      label: t('quotes.totals.shipping'),
      value: formatCop(shippingAmount || '0'),
    },
    ...(shippingTaxable
      ? [
          {
            key: 'shippingVat',
            label: t('quotes.totals.shippingVat'),
            value: formatCop(totals.shippingVat),
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {quote
              ? t('quotes.editor.editTitle', { number: quote.displayNumber })
              : t('quotes.editor.newTitle')}
            {quote ? <QuoteStatusBadge status={quote.status} /> : null}
          </span>
        }
        backTo={quote ? quotePath(quote.id) : QUOTES_PATH}
      />

      {notice ? (
        <div className="mb-5">
          <Alert
            tone="warning"
            title={t('quotes.editor.duplicatedNotice', { number: notice.number })}
          >
            {notice.omittedNames.length > 0 ? (
              <p>{t('quotes.editor.omittedProducts', { names: notice.omittedNames.join(', ') })}</p>
            ) : null}
            {notice.discountReset ? <p>{t('quotes.editor.discountReset')}</p> : null}
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-5 pb-24 lg:grid-cols-[3fr_2fr] lg:items-start lg:pb-0">
        <div className="space-y-5">
          <SectionCard title={t('quotes.editor.customerSection')}>
            {sent ? (
              <p className="text-body text-neutral-900">
                {customer?.name}
                <span className="ml-2 font-mono text-body-sm text-neutral-500">
                  {customer?.documentId}
                </span>
                <span className="mt-1 block text-caption text-neutral-600">
                  {t('quotes.editor.customerLocked')}
                </span>
              </p>
            ) : (
              <Combobox<CustomerDto>
                label={t('quotes.customer')}
                required
                placeholder={t('quotes.editor.customerPlaceholder')}
                inputValue={customerInput}
                onInputChange={(value) => {
                  setCustomerInput(value);
                  if (customer && value !== customer.name) setCustomer(null);
                }}
                loadOptions={async (query, signal) =>
                  (
                    await customersService.list(
                      { q: query, status: 'active', page: 1, pageSize: 8 },
                      signal,
                    )
                  ).items
                }
                getOptionKey={(option) => option.id}
                getOptionLabel={(option) => option.name}
                renderOption={(option) => (
                  <span className="flex justify-between gap-3">
                    {option.name}
                    <span className="font-mono text-body-sm text-neutral-500">
                      {option.documentId}
                    </span>
                  </span>
                )}
                onSelect={(option) => {
                  setCustomer({
                    id: option.id,
                    name: option.name,
                    documentId: option.documentId,
                    isActive: option.isActive,
                  });
                  setCustomerInput(option.name);
                }}
                labels={comboboxLabels}
                error={submitted ? errors.customer : undefined}
              />
            )}
            {customerBlocked ? (
              <div className="mt-3">
                <Alert tone="warning">{t('quotes.editor.customerInactive')}</Alert>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title={t('quotes.editor.productsSection')}>
            <Combobox<ProductDto>
              label={t('quotes.editor.addProduct')}
              placeholder={t('quotes.editor.productPlaceholder')}
              disabled={lines.length >= QUOTE_MAX_ITEMS}
              hint={lines.length >= QUOTE_MAX_ITEMS ? t('quotes.editor.maxLines') : undefined}
              inputValue={productInput}
              onInputChange={setProductInput}
              loadOptions={async (query, signal) => {
                const added = new Set(lines.map((line) => line.productId));
                const { items } = await productsService.list(
                  { q: query, status: 'active', page: 1, pageSize: 20 },
                  signal,
                );
                return items.filter((product) => !added.has(product.id));
              }}
              getOptionKey={(product) => product.id}
              getOptionLabel={(product) => product.name}
              renderOption={(product) => (
                <span className="flex items-baseline justify-between gap-3">
                  <span>
                    {product.name}
                    <span className="ml-2 text-body-sm text-neutral-500">{product.category}</span>
                  </span>
                  <span className="text-body-sm tabular-nums">{formatCop(product.price)}</span>
                </span>
              )}
              onSelect={addProduct}
              labels={comboboxLabels}
              error={submitted ? errors.lines : undefined}
            />

            {lines.length === 0 ? (
              <p className="mt-4 rounded-md bg-neutral-50 p-4 text-center text-body-sm text-neutral-600">
                {t('quotes.editor.linesEmpty')}
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[40rem] border-collapse text-body">
                  <thead className="bg-neutral-50">
                    <tr className="text-left text-overline text-neutral-500 uppercase">
                      <th className="px-3 py-2">{t('quotes.editor.product')}</th>
                      <th className="px-3 py-2 text-right">{t('quotes.editor.unitPrice')}</th>
                      <th className="px-3 py-2 text-right">{t('quotes.editor.vatRate')}</th>
                      <th className="w-28 px-3 py-2 text-right">{t('quotes.editor.quantity')}</th>
                      <th className="px-3 py-2 text-right">{t('quotes.editor.lineAmount')}</th>
                      <th className="w-10 px-1 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {lines.map((line, index) => {
                      const invalid = !isValidQuantity(line.quantity);
                      return (
                        <tr key={line.key}>
                          <td className="px-3 py-2">
                            <span className="block font-medium text-neutral-900">
                              {line.productName}
                            </span>
                            <span className="text-body-sm text-neutral-500">{line.category}</span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {formatCop(line.unitPrice)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {t(`enums.VatRate.${line.vatRate}`)}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              aria-label={`${t('quotes.editor.quantity')} ${line.productName}`}
                              aria-invalid={invalid || undefined}
                              inputMode="decimal"
                              value={formatQuantity(line.quantity)}
                              onChange={(event) => {
                                const raw = event.target.value
                                  .replace(/,/g, '.')
                                  .replace(/[^\d.]/g, '');
                                const [integer = '', ...rest] = raw.split('.');
                                const quantity =
                                  rest.length > 0
                                    ? `${integer}.${rest.join('').slice(0, 2)}`
                                    : integer;
                                setLines((current) =>
                                  current.map((item) =>
                                    item.key === line.key ? { ...item, quantity } : item,
                                  ),
                                );
                              }}
                              className={`h-9 w-full rounded-md border px-2 text-right tabular-nums ${
                                invalid ? 'border-danger-fg' : 'border-neutral-300'
                              }`}
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {formatCop(totals.lineAmounts[index] ?? '0')}
                          </td>
                          <td className="px-1 py-2 text-right">
                            <button
                              type="button"
                              aria-label={t('quotes.editor.remove', { name: line.productName })}
                              onClick={() =>
                                setLines((current) =>
                                  current.filter((item) => item.key !== line.key),
                                )
                              }
                              className="inline-flex size-8 items-center justify-center rounded-md text-neutral-500 hover:bg-danger-bg hover:text-danger-fg"
                            >
                              <TrashIcon size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!quantitiesValid ? (
                  <p className="mt-2 text-caption text-danger-fg">
                    {t('quotes.editor.quantityInvalid')}
                  </p>
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard title={t('quotes.editor.conditionsSection')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label={t('quotes.editor.discountPct')}
                value={discountPct}
                onChange={setDiscountPct}
                suffix="%"
                readOnly={discountLocked}
                error={discountLocked ? undefined : errors.discount}
                hint={t('quotes.editor.discountLimitHint', { limit: formatPercent(myLimit) })}
              />
              <MoneyField
                label={t('quotes.editor.shippingAmount')}
                value={shippingAmount === '0' ? '' : shippingAmount}
                onChange={(value) => setShippingAmount(value || '0')}
                hint={
                  shippingTaxable
                    ? t('quotes.editor.shippingTaxable')
                    : t('quotes.editor.shippingNotTaxable')
                }
              />
            </div>
            {discountLocked ? (
              <div className="mt-3">
                <Alert tone="info">{t('quotes.editor.discountLocked')}</Alert>
              </div>
            ) : null}
            {showOverride ? (
              <div className="mt-3">
                <Alert tone="warning">
                  {t('quotes.editor.discountOverride', { limit: formatPercent(sellerLimit) })}
                </Alert>
              </div>
            ) : null}
          </SectionCard>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <TotalsSummary
            title={t('quotes.editor.totalsTitle')}
            rows={totalsRows}
            totalLabel={t('quotes.totals.total')}
            total={formatCop(totals.total)}
          />
          {parametersFailed ? (
            <Alert
              tone="danger"
              action={
                <Button variant="secondary" size="sm" onClick={params.retry}>
                  {t('common.retry')}
                </Button>
              }
            >
              {t('quotes.editor.parametersError')}
            </Alert>
          ) : null}
          {conflict ? (
            <Alert
              tone="warning"
              action={
                <Button variant="secondary" size="sm" onClick={onReload}>
                  {t('quotes.editor.reload')}
                </Button>
              }
            >
              {t('quotes.editor.conflict')}
            </Alert>
          ) : serverError ? (
            <Alert tone="danger">{errorText(t, serverError)}</Alert>
          ) : null}
          <div className="hidden gap-2 lg:flex lg:justify-end">
            <Button variant="secondary" onClick={cancel} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} loading={saving && !askRequest} disabled={parametersFailed}>
              {quote ? t('quotes.editor.saveChanges') : t('quotes.editor.saveDraft')}
            </Button>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-0 px-4 py-3 shadow-lg lg:hidden">
        <span className="min-w-0">
          <span className="block text-caption text-neutral-500">{t('quotes.totals.total')}</span>
          <span className="text-h3 font-bold tabular-nums">{formatCop(totals.total)}</span>
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={cancel} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={submit}
            loading={saving && !askRequest}
            disabled={parametersFailed}
          >
            {quote ? t('quotes.editor.saveChanges') : t('quotes.editor.saveDraft')}
          </Button>
        </div>
      </div>

      {askRequest && quote ? (
        <CustomerRequestDialog
          title={t('quotes.customerRequest.title')}
          description={t('quotes.customerRequest.context', { number: quote.currentVersion + 1 })}
          label={t('quotes.customerRequest.label')}
          submitLabel={t('quotes.customerRequest.save')}
          loading={saving}
          onSubmit={(text) => void save(text)}
          onClose={() => setAskRequest(false)}
        />
      ) : null}
      {confirmDiscard ? (
        <ConfirmDialog
          title={t('quotes.editor.discardTitle')}
          description={t('quotes.editor.discardDescription')}
          confirmLabel={t('quotes.editor.discard')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => navigate(quote ? quotePath(quote.id) : QUOTES_PATH)}
          onCancel={() => setConfirmDiscard(false)}
        />
      ) : null}
    </>
  );
}
