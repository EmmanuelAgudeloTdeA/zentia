import {
  INTERACTION_NOTE_MAX_LENGTH,
  type DocumentLocale,
  type FollowUpMessageDto,
  type InteractionType,
} from '@zentia/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorKey, isApiError } from '../../../core/errors';
import {
  Alert,
  Button,
  ConfirmDialog,
  CopyIcon,
  SectionCard,
  SendIcon,
  Skeleton,
  TextArea,
  toast,
} from '../../../shared/ui';
import { openMailto } from '../../../shared/lib';
import { InteractionDialog } from '../../follow-up';
import type { FollowUpHighlight } from '../hooks/use-follow-up-highlight';
import { aiService } from '../services/ai.service';

interface FollowUpAssistantPanelProps {
  quote: { id: string; displayNumber: string; customer: { id: string; name: string } };
  highlight: FollowUpHighlight | null;
  documentLocale: DocumentLocale;
  /** La cotización cambió de estado: el detalle se recarga y el panel desaparece. */
  onStale: () => void;
  onInteractionSaved: () => void;
}

type Channel = 'WHATSAPP' | 'EMAIL';

const CHANNEL_TYPE: Record<Channel, InteractionType> = { WHATSAPP: 'WHATSAPP', EMAIL: 'EMAIL' };

function whatsappUrl(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

function mailtoUrl(email: string, text: string): string {
  return `mailto:${email}?body=${encodeURIComponent(text)}`;
}

/** Asistente de seguimiento (H9.1): sugiere un mensaje editable y ofrece canales para usarlo. */
export function FollowUpAssistantPanel({
  quote,
  highlight,
  documentLocale,
  onStale,
  onInteractionSaved,
}: FollowUpAssistantPanelProps) {
  const { t, i18n } = useTranslation();
  const [suggestion, setSuggestion] = useState<FollowUpMessageDto | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [usedChannel, setUsedChannel] = useState<Channel | null>(null);
  const [registering, setRegistering] = useState(false);

  const effective = suggestion
    ? { highlighted: suggestion.highlighted, days: suggestion.daysWithoutFollowUp }
    : highlight;
  const highlighted = effective?.highlighted ?? false;
  const text = message.trim();
  const phone = suggestion?.contact.phone ?? null;
  const email = suggestion?.contact.email ?? null;

  const suggest = async () => {
    setConfirmReplace(false);
    setLoading(true);
    setError(null);
    try {
      const result = await aiService.suggestMessage(quote.id);
      setSuggestion(result);
      setMessage(result.message);
      setUsedChannel(null);
    } catch (suggestError) {
      if (isApiError(suggestError) && suggestError.code === 'QUOTE_INVALID_TRANSITION') {
        toast.error(t(errorKey(suggestError)));
        onStale();
        return;
      }
      setError(suggestError);
    } finally {
      setLoading(false);
    }
  };

  const requestSuggestion = () => {
    if (suggestion && message !== suggestion.message && text) setConfirmReplace(true);
    else void suggest();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('ai.assistant.copied'));
    } catch {
      toast.error(t('ai.assistant.copyError'));
    }
  };

  const openChannel = (channel: Channel) => {
    const url =
      channel === 'WHATSAPP' ? whatsappUrl(phone ?? '', text) : mailtoUrl(email ?? '', text);
    if (channel === 'EMAIL') openMailto(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
    setUsedChannel(channel);
  };

  const errorMessage = isApiError(error)
    ? error.code === 'RATE_LIMITED'
      ? t('ai.assistant.rateLimited')
      : t(errorKey(error))
    : error
      ? t('errors.NETWORK_ERROR')
      : null;
  const emptyHint = suggestion && !text ? t('ai.assistant.emptyMessage') : undefined;

  return (
    <SectionCard
      title={t('ai.assistant.title')}
      {...(highlighted ? { className: 'ring-2 ring-primary-200' } : {})}
    >
      <div className="space-y-3">
        {highlighted && effective ? (
          <Alert tone="info">{t('ai.assistant.highlighted', { days: effective.days })}</Alert>
        ) : null}
        {!suggestion && !loading ? (
          <p className="text-body-sm text-neutral-600">{t('ai.assistant.help')}</p>
        ) : null}
        {loading ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-4" />
            ))}
          </div>
        ) : suggestion ? (
          <>
            {suggestion.source === 'TEMPLATE' ? (
              <Alert tone="info">{t('ai.assistant.templateNotice')}</Alert>
            ) : (
              <p className="text-caption font-medium text-primary-700">
                {t('ai.assistant.aiSource')}
              </p>
            )}
            <TextArea
              label={t('ai.assistant.messageLabel')}
              rows={6}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              hint={emptyHint}
            />
            {documentLocale !== i18n.language.slice(0, 2) ? (
              <p className="text-caption text-neutral-500">
                {t('ai.assistant.documentLocaleNotice', {
                  language: t(`language.${documentLocale}`),
                })}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<CopyIcon size={16} />}
                disabled={!text}
                onClick={() => void copy()}
              >
                {t('ai.assistant.copy')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<SendIcon size={16} />}
                disabled={!text || !phone}
                title={!phone ? t('ai.assistant.noPhone') : undefined}
                onClick={() => openChannel('WHATSAPP')}
              >
                {t('ai.assistant.openWhatsapp')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<SendIcon size={16} />}
                disabled={!text || !email}
                title={!email ? t('ai.assistant.noEmail') : undefined}
                onClick={() => openChannel('EMAIL')}
              >
                {t('ai.assistant.openEmail')}
              </Button>
            </div>
            {!phone || !email ? (
              <p className="text-caption text-neutral-500">
                {!phone ? t('ai.assistant.noPhone') : t('ai.assistant.noEmail')}
              </p>
            ) : null}
            {usedChannel ? (
              <Alert
                tone="info"
                action={
                  <Button variant="secondary" size="sm" onClick={() => setRegistering(true)}>
                    {t('ai.assistant.registerInteraction')}
                  </Button>
                }
              >
                {t('ai.assistant.registerHint')}
              </Alert>
            ) : null}
          </>
        ) : null}
        {errorMessage ? (
          <Alert
            tone="danger"
            action={
              <Button variant="secondary" size="sm" onClick={() => void suggest()}>
                {t('common.retry')}
              </Button>
            }
          >
            {errorMessage}
          </Alert>
        ) : null}
        <Button
          variant={highlighted ? 'primary' : 'secondary'}
          loading={loading}
          onClick={requestSuggestion}
        >
          {suggestion ? t('ai.assistant.suggestAgain') : t('ai.assistant.suggest')}
        </Button>
      </div>
      {confirmReplace ? (
        <ConfirmDialog
          title={t('ai.assistant.replaceTitle')}
          confirmLabel={t('ai.assistant.replaceConfirm')}
          cancelLabel={t('common.cancel')}
          confirmVariant="primary"
          onConfirm={() => void suggest()}
          onCancel={() => setConfirmReplace(false)}
        />
      ) : null}
      {registering && usedChannel ? (
        <InteractionDialog
          customerId={quote.customer.id}
          customerName={quote.customer.name}
          quote={{ id: quote.id, displayNumber: quote.displayNumber }}
          defaultType={CHANNEL_TYPE[usedChannel]}
          defaultNote={text.slice(0, INTERACTION_NOTE_MAX_LENGTH)}
          onClose={() => setRegistering(false)}
          onSaved={() => {
            setRegistering(false);
            setUsedChannel(null);
            toast.success(t('interactions.saved'));
            onInteractionSaved();
          }}
        />
      ) : null}
    </SectionCard>
  );
}
