import type { PdfPurpose, QuoteDto, ShareLinksDto, ShareQuoteRequest } from '@zentia/shared';
import { request, requestBlob } from '../../../core/http-client';

/** Descarga el PDF con su nombre (`COT-0001.pdf`) mediante un enlace temporal. */
async function downloadPdf(id: string, fileName: string, purpose: PdfPurpose = 'view') {
  const blob = await requestBlob(`/quotes/${id}/pdf`, { query: { purpose } });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const documentsService = {
  downloadPdf,
  shareLinks: (id: string) => request<ShareLinksDto>('GET', `/quotes/${id}/share-links`),
  share: (id: string, body: ShareQuoteRequest) =>
    request<QuoteDto>('POST', `/quotes/${id}/share`, { body }),
};
