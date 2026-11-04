import { describe, expect, it } from 'vitest';
import type { QuotePdfModel } from '../application/index.js';
import { JsonDocumentTranslator } from './json-document-translator.js';
import { PdfmakeRenderer } from './pdfmake-renderer.js';

const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function model(lines: number, logo: string | null): QuotePdfModel {
  return {
    company: {
      name: 'Tecnología Ñandú SAS',
      taxId: '900123456',
      address: 'Calle 10',
      city: 'Medellín',
      phone: '6044445566',
      email: 'ventas@nandu.co',
      website: null,
      bankAccounts: 'Cuenta de ahorros',
      commercialTerms: 'Pago a 30 días; garantía de un año.',
      documentLocale: 'es',
      logoDataUrl: logo,
    },
    quote: {
      displayNumber: 'COT-0001',
      status: 'DRAFT',
      issueDate: '2026-11-03',
      expiresAt: '2026-11-18',
      isProjectedExpiry: true,
    },
    customer: { name: 'José Núñez', documentId: '1036', phone: '573001234567', email: null },
    items: Array.from({ length: lines }, (_, index) => ({
      productName: `Portátil año ${index + 1}`,
      quantity: '1.5',
      unitPrice: '2500000',
      vatRate: 'GENERAL_19' as const,
      lineAmount: '3750000',
    })),
    totals: {
      subtotal: '3750000',
      discountPct: '0',
      discountAmount: '0',
      linesVat: '712500',
      shippingAmount: '0',
      shippingTaxable: true,
      shippingVat: '0',
      total: '4462500',
    },
    watermark: 'DRAFT',
  };
}

describe('PdfmakeRenderer', () => {
  const renderer = new PdfmakeRenderer(new JsonDocumentTranslator());

  it('renders a valid PDF with a logo, accents and watermark', async () => {
    const pdf = await renderer.render(model(3, PNG_1X1), 'es');
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1')).toContain('Roboto');
  });

  it('renders 100 lines in less than 5 seconds', async () => {
    const start = performance.now();
    const pdf = await renderer.render(model(100, null), 'en');
    expect(performance.now() - start).toBeLessThan(5000);
    expect(pdf.length).toBeGreaterThan(10_000);
  });
});
