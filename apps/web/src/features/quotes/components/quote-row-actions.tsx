import type { QuoteSummaryDto } from '@zentia/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActionMenu,
  CopyIcon,
  EditIcon,
  EyeIcon,
  FileTextIcon,
  RowActionLink,
  type ActionMenuItem,
} from '../../../shared/ui';
import { useDownloadQuotePdf, useDuplicateQuote } from '../hooks/use-quote-row-actions';
import { SimpleActionDialog } from './quote-action-dialogs';
import { editQuotePath, quotePath } from './quote-paths';

const EDITABLE = new Set<QuoteSummaryDto['status']>(['DRAFT', 'SENT']);
const DUPLICABLE = new Set<QuoteSummaryDto['status']>(['APPROVED', 'REJECTED']);

/** Acciones de la fila sin cambio de estado (D6): ver, editar, PDF y duplicar. */
export function QuoteRowActions({ quote }: { quote: QuoteSummaryDto }) {
  const { t } = useTranslation();
  const pdf = useDownloadQuotePdf();
  const duplication = useDuplicateQuote();
  const [confirming, setConfirming] = useState(false);

  const items: ActionMenuItem[] = [
    {
      key: 'downloadPdf',
      label: t('quotes.actions.downloadPdf'),
      icon: <FileTextIcon size={16} />,
      onSelect: () => void pdf.download(quote),
    },
    ...(DUPLICABLE.has(quote.status)
      ? [
          {
            key: 'duplicate',
            label: t('quotes.actions.duplicate'),
            icon: <CopyIcon size={16} />,
            onSelect: () => setConfirming(true),
          },
        ]
      : []),
  ];

  return (
    <>
      <RowActionLink
        to={quotePath(quote.id)}
        label={t('common.actions.viewDetail')}
        icon={<EyeIcon size={16} />}
      />
      {EDITABLE.has(quote.status) ? (
        <RowActionLink
          to={editQuotePath(quote.id)}
          label={t('quotes.actions.edit')}
          icon={<EditIcon size={16} />}
        />
      ) : null}
      <ActionMenu
        label={t('quotes.list.moreActions', { number: quote.displayNumber })}
        items={items}
      />
      {confirming ? (
        <SimpleActionDialog
          kind="duplicate"
          quote={quote}
          busy={duplication.busy || pdf.loading}
          error={duplication.error}
          onReload={() => duplication.reset()}
          onCancel={() => {
            setConfirming(false);
            duplication.reset();
          }}
          onConfirm={() => void duplication.duplicate(quote)}
        />
      ) : null}
    </>
  );
}
