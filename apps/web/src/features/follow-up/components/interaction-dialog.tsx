import {
  INTERACTION_NOTE_MAX_LENGTH,
  INTERACTION_TYPES,
  type InteractionDto,
  type InteractionType,
  type QuoteSummaryDto,
} from '@zentia/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorKey, isApiError } from '../../../core/errors';
import { Alert, Button, Dialog, Select, Skeleton, TextArea, TextField } from '../../../shared/ui';
import { quotesService } from '../../quotes';
import { interactionsService } from '../services/interactions.service';

/** `datetime-local` en la hora del navegador, sin segundos. */
function localDateTime(date: Date): string {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

interface InteractionDialogProps {
  customerId: string;
  customerName: string;
  /** Abierto desde una cotización: queda preseleccionada. */
  quote?: { id: string; displayNumber: string };
  onClose: () => void;
  onSaved: (interaction: InteractionDto) => void;
}

export function InteractionDialog({
  customerId,
  customerName,
  quote,
  onClose,
  onSaved,
}: InteractionDialogProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<InteractionType | ''>('');
  const [occurredAt, setOccurredAt] = useState(() => localDateTime(new Date()));
  const [note, setNote] = useState('');
  const [quoteId, setQuoteId] = useState(quote?.id ?? '');
  const [quotes, setQuotes] = useState<QuoteSummaryDto[] | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<unknown>(null);
  const max = localDateTime(new Date());
  const future = occurredAt !== '' && occurredAt > max;

  useEffect(() => {
    let cancelled = false;
    quotesService
      .list({ statuses: [], customerId, page: 1, pageSize: 100 })
      .then(({ items }) => {
        // Las Enviadas primero: son las que tienen seguimiento pendiente (G3 del ui-brief).
        const sorted = [...items].sort(
          (a, b) => Number(b.status === 'SENT') - Number(a.status === 'SENT'),
        );
        if (!cancelled) setQuotes(sorted);
      })
      .catch(() => !cancelled && setQuotes([]));
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const save = async () => {
    setSubmitted(true);
    if (!type || !note.trim() || future) return;
    setSaving(true);
    setServerError(null);
    try {
      onSaved(
        await interactionsService.create({
          customerId,
          quoteId: quoteId || null,
          type,
          note: note.trim(),
          occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        }),
      );
    } catch (error) {
      setServerError(error);
    } finally {
      setSaving(false);
    }
  };

  const quoteError =
    isApiError(serverError) &&
    (serverError.code === 'INTERACTION_QUOTE_MISMATCH' || serverError.code === 'QUOTE_NOT_FOUND')
      ? t(errorKey(serverError))
      : undefined;
  const dateError =
    future || (isApiError(serverError) && serverError.code === 'INTERACTION_FUTURE_DATE')
      ? t('interactions.futureDate')
      : undefined;

  return (
    <Dialog
      size="md"
      title={t('interactions.dialogTitle')}
      description={quote ? `${customerName} · ${quote.displayNumber}` : customerName}
      onClose={onClose}
      closeLabel={t('common.close')}
      dismissible={!note.trim()}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button loading={saving} onClick={() => void save()}>
            {t('interactions.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('interactions.fields.type')}
            required
            value={type}
            onChange={(event) => setType(event.target.value as InteractionType)}
            options={[
              { value: '', label: '—' },
              ...INTERACTION_TYPES.map((value) => ({
                value,
                label: t(`enums.InteractionType.${value}`),
              })),
            ]}
            error={submitted && !type ? t('interactions.typeRequired') : undefined}
          />
          <TextField
            label={t('interactions.fields.occurredAt')}
            type="datetime-local"
            value={occurredAt}
            max={max}
            onChange={(event) => setOccurredAt(event.target.value)}
            error={dateError}
          />
        </div>
        <TextArea
          label={t('interactions.fields.note')}
          required
          rows={4}
          maxLength={INTERACTION_NOTE_MAX_LENGTH}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          error={submitted && !note.trim() ? t('validation.required') : undefined}
          hint={`${note.length} / ${INTERACTION_NOTE_MAX_LENGTH} · ${t('interactions.immutableHint')}`}
        />
        {quotes === null ? (
          <Skeleton className="h-10" />
        ) : (
          <Select
            label={t('interactions.fields.quote')}
            value={quoteId}
            onChange={(event) => setQuoteId(event.target.value)}
            options={[
              { value: '', label: t('interactions.none') },
              ...quotes.map((item) => ({
                value: item.id,
                label: `${item.displayNumber} · ${t(`enums.QuoteStatus.${item.status}`)}`,
              })),
            ]}
            error={quoteError}
          />
        )}
        {serverError && !quoteError && !dateError ? (
          <Alert tone="danger">{t(errorKey(serverError))}</Alert>
        ) : null}
      </div>
    </Dialog>
  );
}
