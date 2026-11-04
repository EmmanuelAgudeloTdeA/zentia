import { z } from 'zod';

export const SHARE_CHANNELS = ['WHATSAPP', 'EMAIL'] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export const shareLinksDtoSchema = z.object({
  whatsappUrl: z.string().nullable(),
  emailUrl: z.string().nullable(),
  /** Datos de contacto que le faltan al cliente. */
  missing: z.array(z.enum(['PHONE', 'EMAIL'])),
  /** Motivo por el que no hay enlaces aunque el estado lo permita. */
  unavailableReason: z.enum(['CUSTOMER_INACTIVE']).nullable(),
});

export type ShareLinksDto = z.infer<typeof shareLinksDtoSchema>;

export const shareQuoteRequestSchema = z.object({
  channel: z.enum(SHARE_CHANNELS),
  updatedAt: z.iso.datetime(),
});

export type ShareQuoteRequest = z.infer<typeof shareQuoteRequestSchema>;

/** `send`: PDF para el cliente, sin marca de agua ni vencimiento "previsto" (V1 del ui-brief de M5). */
export const pdfQuerySchema = z.object({
  purpose: z.enum(['view', 'send']).default('view'),
});

export type PdfPurpose = z.output<typeof pdfQuerySchema>['purpose'];
