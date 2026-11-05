import type { PdfPurpose } from '@zentia/shared';
import { useTranslation } from 'react-i18next';
import { Button, FileTextIcon, type ButtonVariant } from '../../../shared/ui';
import { useDownloadQuotePdf } from '../hooks/use-quote-row-actions';

interface DownloadPdfButtonProps {
  quoteId: string;
  displayNumber: string;
  purpose?: PdfPurpose;
  variant?: ButtonVariant;
  onDownloaded?: () => void;
}

/** La descarga es la confirmación: sin toast de éxito; los errores se informan con toast. */
export function DownloadPdfButton({
  quoteId,
  displayNumber,
  purpose = 'view',
  variant = 'secondary',
  onDownloaded,
}: DownloadPdfButtonProps) {
  const { t } = useTranslation();
  const { loading, download: downloadPdf } = useDownloadQuotePdf();

  const download = async () => {
    if (await downloadPdf({ id: quoteId, displayNumber }, purpose)) onDownloaded?.();
  };

  return (
    <Button
      variant={variant}
      icon={<FileTextIcon size={16} />}
      loading={loading}
      onClick={() => void download()}
    >
      {t('quotes.actions.downloadPdf')}
    </Button>
  );
}
