import {
  formatQuoteNumber,
  type PdfPurpose,
  type QuoteDto,
  type ShareLinksDto,
  type ShareQuoteRequest,
} from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type { Actor } from '../../auth/index.js';
import type { Quote } from '../../quotes/index.js';
import type { DocumentsDependencies } from './documents-dependencies.js';
import { addDays, buildQuotePdfModel } from './quote-pdf-model.js';

const SHAREABLE: readonly Quote['status'][] = ['DRAFT', 'SENT'];

export interface QuotePdf {
  fileName: string;
  content: Buffer;
}

export class GenerateQuotePdfUseCase {
  constructor(private readonly deps: DocumentsDependencies) {}

  async execute(actor: Actor, id: string, purpose: PdfPurpose): Promise<QuotePdf> {
    const quote = await this.deps.quotes.getForActor(id, actor);
    const [profile, params, customer] = await Promise.all([
      this.deps.settings.getDocumentProfile(),
      this.deps.settings.getCommercialParameters(),
      this.deps.customers.getById(quote.customer.id),
    ]);
    const model = buildQuotePdfModel(quote, profile, {
      today: this.deps.clock.today(),
      validityDays: params.validityDays,
      purpose,
      customerContact: { phone: customer.phone, email: customer.email },
    });
    try {
      const content = await this.deps.renderer.render(model, profile.documentLocale);
      return { fileName: `${model.quote.displayNumber}.pdf`, content };
    } catch {
      throw new AppError('PDF_GENERATION_FAILED', 500);
    }
  }
}

/** RFC 6068: los saltos de línea del cuerpo van como CRLF codificado. */
function mailtoComponent(value: string): string {
  return encodeURIComponent(value.replace(/\r?\n/g, '\r\n'));
}

export class GetShareLinksUseCase {
  constructor(private readonly deps: DocumentsDependencies) {}

  async execute(actor: Actor, id: string): Promise<ShareLinksDto> {
    const quote = await this.deps.quotes.getForActor(id, actor);
    const customer = await this.deps.customers.getById(quote.customer.id);
    const missing: ShareLinksDto['missing'] = [
      ...(customer.phone ? [] : ['PHONE' as const]),
      ...(customer.email ? [] : ['EMAIL' as const]),
    ];
    if (!SHAREABLE.includes(quote.status)) return { whatsappUrl: null, emailUrl: null, missing };

    const [profile, params] = await Promise.all([
      this.deps.settings.getDocumentProfile(),
      this.deps.settings.getCommercialParameters(),
    ]);
    const locale = profile.documentLocale;
    const translator = this.deps.translator;
    const companyName = profile.name ?? '';
    const quoteNumber = formatQuoteNumber(quote.number);
    const expiresAt = quote.expiresAt ?? addDays(this.deps.clock.today(), params.validityDays);
    const message = translator.t('share.message', locale, {
      customerName: customer.name,
      quoteNumber,
      total: translator.formatMoney(quote.total, locale),
      expiresAt: translator.formatDay(expiresAt, locale),
      sellerName: quote.owner.name,
      companyName,
    });
    const subject = translator.t('share.email.subject', locale, { quoteNumber, companyName });
    const body = translator.t('share.email.body', locale, { message });

    return {
      whatsappUrl: customer.phone
        ? `https://wa.me/${customer.phone}?text=${encodeURIComponent(message)}`
        : null,
      emailUrl: customer.email
        ? `mailto:${encodeURIComponent(customer.email).replace('%40', '@')}?subject=${mailtoComponent(subject)}&body=${mailtoComponent(body)}`
        : null,
      missing,
    };
  }
}

/** S5.2.3: usar un canal envía la cotización si es Borrador; en Enviada no cambia nada. */
export class ShareQuoteUseCase {
  constructor(private readonly deps: DocumentsDependencies) {}

  async execute(
    actor: Actor,
    id: string,
    { channel, updatedAt }: ShareQuoteRequest,
  ): Promise<QuoteDto> {
    const quote = await this.deps.quotes.getForActor(id, actor);
    if (!SHAREABLE.includes(quote.status)) {
      throw new AppError('QUOTE_INVALID_TRANSITION', 409, { from: quote.status, to: 'SENT' });
    }
    const customer = await this.deps.customers.getById(quote.customer.id);
    if ((channel === 'WHATSAPP' && !customer.phone) || (channel === 'EMAIL' && !customer.email)) {
      throw new AppError('SHARE_CHANNEL_UNAVAILABLE', 400, { channel });
    }
    if (quote.updatedAt.getTime() !== new Date(updatedAt).getTime()) {
      throw new AppError('QUOTE_CONFLICT', 409);
    }
    if (quote.status === 'DRAFT') return this.deps.sendQuote.execute(actor, id, { updatedAt });
    return this.deps.quotes.getDtoForActor(id, actor);
  }
}

/** Acciones que M5 suma a `allowedActions` de M4 (decisión 136). */
export function documentActions(quote: Quote): string[] {
  return ['downloadPdf', ...(SHAREABLE.includes(quote.status) ? ['share'] : [])];
}
