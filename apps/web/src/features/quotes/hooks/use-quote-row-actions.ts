import type { PdfPurpose, QuoteDto } from '@zentia/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from '../../../shared/ui';
import { errorText } from '../components/quote-format';
import { editQuotePath } from '../components/quote-paths';
import { documentsService } from '../services/documents.service';
import { quotesService } from '../services/quotes.service';

interface QuoteRef {
  id: string;
  displayNumber: string;
}

/** Descarga el PDF; la descarga es la confirmación y los errores se informan con toast. */
export function useDownloadQuotePdf() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const download = async (quote: QuoteRef, purpose: PdfPurpose = 'view') => {
    setLoading(true);
    try {
      await documentsService.downloadPdf(quote.id, quote.displayNumber, purpose);
      return true;
    } catch (error) {
      toast.error(errorText(t, error));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { loading, download };
}

/** Duplica y abre el editor con los avisos; si no se conocen las líneas, las consulta solo cuando hay omitidos. */
export function useDuplicateQuote() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const duplicate = async (quote: QuoteRef & { items?: QuoteDto['items'] }) => {
    setBusy(true);
    setError(null);
    try {
      const result = await quotesService.duplicate(quote.id);
      toast.success(t('quotes.toast.duplicated', { number: result.quote.displayNumber }));
      const items =
        result.omittedProductIds.length === 0
          ? []
          : (quote.items ?? (await quotesService.get(quote.id)).items);
      const omittedNames = items
        .filter((item) => result.omittedProductIds.includes(item.productId))
        .map((item) => item.productName);
      navigate(editQuotePath(result.quote.id), {
        state: {
          duplicate: {
            number: result.quote.displayNumber,
            omittedNames,
            discountReset: result.discountReset,
          },
        },
      });
    } catch (duplicateError) {
      setError(duplicateError);
      setBusy(false);
    }
  };

  const reset = () => setError(null);

  return { busy, error, duplicate, reset };
}
