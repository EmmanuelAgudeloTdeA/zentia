import type { Clock } from '../../../core/clock/index.js';
import type { SettingsReader } from '../../company-settings/index.js';
import type { CustomerReader } from '../../customers/index.js';
import type { QuoteReader, SendQuoteUseCase } from '../../quotes/index.js';
import type { DocumentTranslator, PdfRenderer } from './ports/index.js';

export interface DocumentsInfrastructure {
  renderer: PdfRenderer;
  translator: DocumentTranslator;
}

export interface DocumentsDependencies extends DocumentsInfrastructure {
  quotes: QuoteReader;
  sendQuote: SendQuoteUseCase;
  settings: SettingsReader;
  customers: CustomerReader;
  clock: Clock;
}
