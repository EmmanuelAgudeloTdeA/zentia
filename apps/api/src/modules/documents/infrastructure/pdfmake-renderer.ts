import { createRequire } from 'node:module';
import type { DocumentLocale } from '@zentia/shared';
import type * as PdfMake from 'pdfmake';
import type { Content, TableCell } from 'pdfmake';
import type { DocumentTranslator, PdfRenderer, QuotePdfModel } from '../application/index.js';

const require = createRequire(import.meta.url);
// pdfmake es CommonJS y exporta una instancia; las fuentes Roboto vienen en el paquete (tildes y ñ).
const pdfmake = require('pdfmake') as typeof PdfMake;

type TDocumentDefinitions = Parameters<typeof pdfmake.createPdf>[0];
const robotoDir = require
  .resolve('pdfmake/fonts/Roboto/Roboto-Regular.ttf')
  .replace(/Roboto-Regular\.ttf$/, '');

pdfmake.setFonts({
  Roboto: {
    normal: `${robotoDir}Roboto-Regular.ttf`,
    bold: `${robotoDir}Roboto-Medium.ttf`,
    italics: `${robotoDir}Roboto-Italic.ttf`,
    bolditalics: `${robotoDir}Roboto-MediumItalic.ttf`,
  },
});
// Solo se usan las fuentes del paquete y el logo en data URL: no se permite ningún otro recurso.
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((path) => path.startsWith(robotoDir));

const PRIMARY = '#1f4f94';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';

export class PdfmakeRenderer implements PdfRenderer {
  constructor(private readonly translator: DocumentTranslator) {}

  async render(model: QuotePdfModel, locale: DocumentLocale): Promise<Buffer> {
    return pdfmake.createPdf(this.definition(model, locale)).getBuffer();
  }

  private definition(model: QuotePdfModel, locale: DocumentLocale): TDocumentDefinitions {
    const tr = this.translator;
    const t = (key: string, params?: Record<string, string | number>) => tr.t(key, locale, params);
    const money = (value: string) => tr.formatMoney(value, locale);
    const { company, quote, customer, totals } = model;

    const companyLines = [
      company.taxId ? t('pdf.company.taxId', { taxId: company.taxId }) : null,
      company.address ? [company.address, company.city].filter(Boolean).join(', ') : company.city,
      company.phone,
      company.email,
      company.website,
    ].filter((line): line is string => Boolean(line));

    const brand: Content = company.logoDataUrl
      ? { image: company.logoDataUrl, fit: [140, 60] }
      : { text: company.name ?? '', style: 'companyName' };

    const expiresAt = tr.formatDay(quote.expiresAt, locale);
    const header: Content = {
      columns: [
        {
          width: '*',
          stack: [
            brand,
            ...(company.logoDataUrl && company.name
              ? [{ text: company.name, bold: true, margin: [0, 6, 0, 0] }]
              : []),
            { text: companyLines.join('\n'), style: 'muted', margin: [0, 4, 0, 0] },
          ],
        } as Content,
        {
          width: 'auto',
          stack: [
            { text: t('pdf.title').toUpperCase(), style: 'title', alignment: 'right' },
            { text: quote.displayNumber, style: 'number', alignment: 'right' },
            {
              margin: [0, 8, 0, 0],
              table: {
                body: [
                  [
                    { text: t('pdf.issueDate'), style: 'label' },
                    tr.formatDay(quote.issueDate, locale),
                  ],
                  [
                    { text: t('pdf.expiresAt'), style: 'label' },
                    quote.isProjectedExpiry
                      ? t('pdf.projectedExpiry', { date: expiresAt })
                      : expiresAt,
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
        } as Content,
      ],
    };

    const customerBlock: Content = {
      margin: [0, 18, 0, 0],
      table: {
        widths: ['*'],
        body: [
          [
            {
              fillColor: '#f7f9fc',
              margin: [8, 6, 8, 6],
              stack: [
                { text: t('pdf.customer.title').toUpperCase(), style: 'label' },
                { text: customer.name, bold: true, fontSize: 11, margin: [0, 2, 0, 2] },
                {
                  text: [
                    `${t('pdf.customer.documentId')}: ${customer.documentId}`,
                    customer.phone ? `   ${t('pdf.customer.phone')}: +${customer.phone}` : '',
                    customer.email ? `   ${t('pdf.customer.email')}: ${customer.email}` : '',
                  ].join(''),
                  style: 'muted',
                },
              ],
            },
          ],
        ],
      },
      layout: 'noBorders',
    };

    const head = (text: string, alignment: 'left' | 'right' = 'left'): TableCell => ({
      text,
      style: 'tableHeader',
      alignment,
    });
    const itemsTable: Content = {
      margin: [0, 16, 0, 0],
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            head(t('pdf.table.product')),
            head(t('pdf.table.quantity'), 'right'),
            head(t('pdf.table.unitPrice'), 'right'),
            head(t('pdf.table.vatRate'), 'right'),
            head(t('pdf.table.amount'), 'right'),
          ],
          ...model.items.map((item) => [
            item.productName,
            { text: tr.formatNumber(item.quantity, locale), alignment: 'right' as const },
            { text: money(item.unitPrice), alignment: 'right' as const },
            { text: t(`pdf.vatRate.${item.vatRate}`), alignment: 'right' as const },
            { text: money(item.lineAmount), alignment: 'right' as const },
          ]),
        ],
      },
      layout: {
        hLineWidth: (index) => (index === 1 ? 1 : 0.5),
        vLineWidth: () => 0,
        hLineColor: () => BORDER,
        paddingTop: () => 5,
        paddingBottom: () => 5,
      },
    };

    const totalRow = (label: string, value: string, bold = false): TableCell[] => [
      { text: label, alignment: 'right', bold, fontSize: bold ? 12 : 10 },
      { text: value, alignment: 'right', bold, fontSize: bold ? 12 : 10 },
    ];
    const totalsTable: Content = {
      margin: [0, 12, 0, 0],
      columns: [
        { width: '*', text: t('pdf.pricesNote'), style: 'muted', margin: [0, 4, 0, 0] },
        {
          width: 'auto',
          table: {
            widths: [130, 100],
            body: [
              totalRow(t('pdf.totals.subtotal'), money(totals.subtotal)),
              totalRow(
                t('pdf.totals.discount', { pct: tr.formatNumber(totals.discountPct, locale) }),
                `- ${money(totals.discountAmount)}`,
              ),
              totalRow(t('pdf.totals.linesVat'), money(totals.linesVat)),
              totalRow(t('pdf.totals.shipping'), money(totals.shippingAmount)),
              ...(totals.shippingTaxable
                ? [totalRow(t('pdf.totals.shippingVat'), money(totals.shippingVat))]
                : []),
              totalRow(t('pdf.totals.total'), money(totals.total), true),
            ],
          },
          layout: {
            hLineWidth: (index, node) => (index === node.table.body.length - 1 ? 1 : 0),
            vLineWidth: () => 0,
            hLineColor: () => PRIMARY,
          },
        },
      ],
    };

    const notes: Content[] = [
      ...(company.commercialTerms
        ? [
            { text: t('pdf.commercialTerms'), style: 'section' },
            { text: company.commercialTerms, style: 'body' },
          ]
        : []),
      ...(company.bankAccounts
        ? [
            { text: t('pdf.bankAccounts'), style: 'section' },
            { text: company.bankAccounts, style: 'body' },
          ]
        : []),
    ];

    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 50],
      info: {
        title: `${t('pdf.title')} ${quote.displayNumber}`,
        author: company.name ?? undefined,
      },
      ...(model.watermark
        ? {
            watermark: {
              text: t(`pdf.watermark.${model.watermark}`),
              color: '#94a3b8',
              opacity: 0.18,
              bold: true,
            },
          }
        : {}),
      footer: (current, total) => ({
        text: t('pdf.page', { current, total }),
        alignment: 'center',
        style: 'muted',
        margin: [0, 15, 0, 0],
      }),
      content: [header, customerBlock, itemsTable, totalsTable, ...notes],
      defaultStyle: { font: 'Roboto', fontSize: 10, color: '#0f172a' },
      styles: {
        companyName: { fontSize: 18, bold: true, color: PRIMARY },
        title: { fontSize: 16, bold: true, color: PRIMARY },
        number: { fontSize: 13, bold: true },
        label: { fontSize: 8, bold: true, color: MUTED },
        muted: { fontSize: 9, color: MUTED },
        tableHeader: { fontSize: 8, bold: true, color: MUTED, fillColor: '#f7f9fc' },
        section: { fontSize: 10, bold: true, color: PRIMARY, margin: [0, 18, 0, 4] },
        body: { fontSize: 9, lineHeight: 1.3 },
      },
    };
  }
}
