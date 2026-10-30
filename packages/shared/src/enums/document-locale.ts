import { LOCALES } from './locale.js';

/** Idioma del PDF y del mensaje de IA; independiente del idioma de la interfaz. */
export const DOCUMENT_LOCALES = LOCALES;

export type DocumentLocale = (typeof DOCUMENT_LOCALES)[number];
