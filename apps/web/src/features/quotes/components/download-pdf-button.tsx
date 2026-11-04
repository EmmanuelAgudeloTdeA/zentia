import type { PdfPurpose } from '@zentia/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, FileTextIcon, toast, type ButtonVariant } from '../../../shared/ui';
import { documentsService } from '../services/documents.service';
import { errorText } from './quote-format';

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
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      await documentsService.downloadPdf(quoteId, displayNumber, purpose);
      onDownloaded?.();
    } catch (error) {
      toast.error(errorText(t, error));
    } finally {
      setLoading(false);
    }
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
