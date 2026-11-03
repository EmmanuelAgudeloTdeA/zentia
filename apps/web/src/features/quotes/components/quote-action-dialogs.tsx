import {
  VOID_REASON_MAX_LENGTH,
  type QuoteDto,
  type ReactivationPreview,
  type UserOptionDto,
} from '@zentia/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isApiError } from '../../../core/errors';
import { formatCop, formatDay, todayInBogota } from '../../../core/format';
import {
  Alert,
  Button,
  Combobox,
  ConfirmDialog,
  Dialog,
  Skeleton,
  TextField,
} from '../../../shared/ui';
import { usersService } from '../../users';
import { quotesService } from '../services/quotes.service';
import { CustomerRequestDialog } from './customer-request-dialog';
import { errorText } from './quote-format';

export type QuoteDialog =
  'send' | 'approve' | 'reject' | 'void' | 'changeExpiry' | 'reassign' | 'reactivate' | 'duplicate';

interface DialogProps {
  quote: QuoteDto;
  busy: boolean;
  error: unknown;
  onCancel: () => void;
  onReload: () => void;
}

function ErrorAlert({ error, onReload }: { error: unknown; onReload: () => void }) {
  const { t } = useTranslation();
  if (!error) return null;
  if (isApiError(error) && error.code === 'QUOTE_CONFLICT') {
    return (
      <Alert
        tone="warning"
        action={
          <Button variant="secondary" size="sm" onClick={onReload}>
            {t('quotes.editor.reload')}
          </Button>
        }
      >
        {errorText(t, error)}
      </Alert>
    );
  }
  return <Alert tone="danger">{errorText(t, error)}</Alert>;
}

export function SimpleActionDialog({
  kind,
  quote,
  busy,
  error,
  onCancel,
  onReload,
  onConfirm,
  sendExpiresAt,
}: DialogProps & {
  kind: 'send' | 'approve' | 'reject' | 'duplicate';
  onConfirm: () => void;
  sendExpiresAt: string;
}) {
  const { t } = useTranslation();
  const number = quote.displayNumber;
  const confirmLabel = {
    send: t('quotes.actions.send'),
    approve: t('quotes.actions.approve'),
    reject: t('quotes.actions.reject'),
    duplicate: t('quotes.actions.duplicate'),
  }[kind];
  return (
    <ConfirmDialog
      title={t(`quotes.dialogs.${kind}.title`, { number })}
      description={t(`quotes.dialogs.${kind}.description`, {
        number,
        date: formatDay(sendExpiresAt),
      })}
      confirmLabel={confirmLabel}
      confirmVariant={kind === 'reject' ? 'danger' : 'primary'}
      cancelLabel={t('common.cancel')}
      loading={busy}
      error={<ErrorAlert error={error} onReload={onReload} />}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export function VoidQuoteDialog({
  quote,
  busy,
  error,
  onCancel,
  onReload,
  onConfirm,
}: DialogProps & { onConfirm: (reason: string) => void }) {
  const { t } = useTranslation();
  return (
    <CustomerRequestDialog
      title={t('quotes.dialogs.void.title', { number: quote.displayNumber })}
      description={t('quotes.dialogs.void.description', { number: quote.displayNumber })}
      label={t('quotes.dialogs.void.reason')}
      submitLabel={t('quotes.actions.void')}
      maxLength={VOID_REASON_MAX_LENGTH}
      loading={busy}
      error={<ErrorAlert error={error} onReload={onReload} />}
      onSubmit={onConfirm}
      onClose={onCancel}
    />
  );
}

export function ChangeExpiryDialog({
  quote,
  busy,
  error,
  onCancel,
  onReload,
  onConfirm,
}: DialogProps & { onConfirm: (date: string) => void }) {
  const { t } = useTranslation();
  const [date, setDate] = useState('');
  const [touched, setTouched] = useState(false);
  const invalid = !date || date <= todayInBogota();
  return (
    <Dialog
      size="sm"
      title={t('quotes.dialogs.expiry.title')}
      description={
        quote.expiresAt
          ? t('quotes.dialogs.expiry.current', { date: formatDay(quote.expiresAt) })
          : undefined
      }
      onClose={onCancel}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            loading={busy}
            onClick={() => {
              setTouched(true);
              if (!invalid) onConfirm(date);
            }}
          >
            {t('quotes.dialogs.expiry.submit')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField
          label={t('quotes.dialogs.expiry.newDate')}
          type="date"
          required
          value={date}
          min={todayInBogota()}
          onChange={(event) => setDate(event.target.value)}
          error={touched && invalid ? t('quotes.dialogs.expiry.invalid') : undefined}
        />
        <ErrorAlert error={error} onReload={onReload} />
      </div>
    </Dialog>
  );
}

export function ReassignDialog({
  quote,
  busy,
  error,
  onCancel,
  onReload,
  onConfirm,
}: DialogProps & { onConfirm: (owner: UserOptionDto) => void }) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [target, setTarget] = useState<UserOptionDto | null>(null);
  const [touched, setTouched] = useState(false);
  return (
    <Dialog
      size="md"
      title={t('quotes.dialogs.reassign.title', { number: quote.displayNumber })}
      description={t('quotes.dialogs.reassign.current', { name: quote.owner.name })}
      onClose={onCancel}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            loading={busy}
            onClick={() => {
              setTouched(true);
              if (target) onConfirm(target);
            }}
          >
            {t('quotes.dialogs.reassign.submit')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Combobox<UserOptionDto>
          label={t('quotes.dialogs.reassign.target')}
          required
          minChars={0}
          inputValue={input}
          onInputChange={(value) => {
            setInput(value);
            setTarget(null);
          }}
          loadOptions={async (query) => {
            const key = query.toLocaleLowerCase();
            return (await usersService.options()).filter(
              (user) => user.id !== quote.owner.id && user.name.toLocaleLowerCase().includes(key),
            );
          }}
          getOptionKey={(user) => user.id}
          getOptionLabel={(user) => user.name}
          renderOption={(user) => (
            <span className="flex justify-between gap-3">
              {user.name}
              <span className="text-body-sm text-neutral-500">{t(`enums.Role.${user.role}`)}</span>
            </span>
          )}
          onSelect={(user) => {
            setTarget(user);
            setInput(user.name);
          }}
          labels={{
            loading: t('common.combobox.loading'),
            noResults: t('common.combobox.noResults'),
            error: t('common.combobox.error'),
          }}
          error={touched && !target ? t('quotes.dialogs.reassign.targetRequired') : undefined}
        />
        <ErrorAlert error={error} onReload={onReload} />
      </div>
    </Dialog>
  );
}

export function ReactivateDialog({
  quote,
  busy,
  error,
  onCancel,
  onReload,
  onConfirm,
}: DialogProps & {
  onConfirm: (input: { customerRequest: string; updatePrices: boolean }) => void;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<ReactivationPreview | null>(null);
  const [previewError, setPreviewError] = useState<unknown>(null);
  const [updatePrices, setUpdatePrices] = useState(true);

  useEffect(() => {
    quotesService.reactivationPreview(quote.id).then(setPreview, setPreviewError);
  }, [quote.id]);

  return (
    <CustomerRequestDialog
      size="lg"
      title={t('quotes.dialogs.reactivate.title', { number: quote.displayNumber })}
      description={
        preview
          ? t('quotes.dialogs.reactivate.newExpiry', { date: formatDay(preview.newExpiresAt) })
          : undefined
      }
      label={t('quotes.dialogs.reactivate.request')}
      submitLabel={t('quotes.dialogs.reactivate.submit')}
      loading={busy}
      error={<ErrorAlert error={error ?? previewError} onReload={onReload} />}
      onSubmit={(customerRequest) => onConfirm({ customerRequest, updatePrices })}
      onClose={onCancel}
    >
      {preview ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-body-sm">
            <thead className="bg-neutral-50 text-left text-overline text-neutral-500 uppercase">
              <tr>
                <th className="px-3 py-2">{t('quotes.editor.product')}</th>
                <th className="px-3 py-2 text-right">
                  {t('quotes.dialogs.reactivate.currentPrice')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('quotes.dialogs.reactivate.catalogPrice')}
                </th>
                <th className="px-3 py-2 text-right">
                  {t('quotes.dialogs.reactivate.difference')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {preview.lines.map((line) => (
                <tr key={line.itemId}>
                  <td className="px-3 py-2">
                    {line.productName}
                    {line.productActive ? null : (
                      <span className="mt-1 block text-caption text-warning-fg">
                        {t('quotes.dialogs.reactivate.inactive')}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCop(line.currentPrice)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCop(line.catalogPrice)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {line.productActive
                      ? formatCop(
                          (BigInt(line.catalogPrice) - BigInt(line.currentPrice)).toString(),
                        )
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <label className="mt-3 flex items-center gap-2 text-body text-neutral-800">
            <input
              type="checkbox"
              checked={updatePrices}
              onChange={(event) => setUpdatePrices(event.target.checked)}
              className="size-4 accent-primary-600"
            />
            {t('quotes.dialogs.reactivate.updatePrices')}
          </label>
        </div>
      ) : previewError ? null : (
        <Skeleton className="h-24" />
      )}
    </CustomerRequestDialog>
  );
}
