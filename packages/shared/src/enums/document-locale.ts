import { LOCALES } from './locale.js';

export const DOCUMENT_LOCALES = LOCALES;

export type DocumentLocale = (typeof DOCUMENT_LOCALES)[number];
