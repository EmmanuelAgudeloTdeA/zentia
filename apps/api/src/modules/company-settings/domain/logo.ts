import { LOGO_MAX_BYTES, LOGO_MIME_TYPES, type LogoMimeType } from '@zentia/shared';

export type LogoValidation =
  { ok: true; mimeType: LogoMimeType } | { ok: false; reason: 'invalidType' | 'tooLarge' };

export interface EncodedLogo {
  mimeType: LogoMimeType;
  base64: string;
}

export function isLogoMimeType(value: string): value is LogoMimeType {
  return (LOGO_MIME_TYPES as readonly string[]).includes(value);
}

/** El tipo declarado debe coincidir con la firma real de los bytes. */
export function validateLogo(
  declared: string,
  detected: LogoMimeType | null,
  size: number,
): LogoValidation {
  if (!isLogoMimeType(declared) || detected !== declared) {
    return { ok: false, reason: 'invalidType' };
  }
  if (size > LOGO_MAX_BYTES) return { ok: false, reason: 'tooLarge' };
  return { ok: true, mimeType: declared };
}

export function toLogoDataUrl({ mimeType, base64 }: EncodedLogo): string {
  return `data:${mimeType};base64,${base64}`;
}

const DATA_URL_PATTERN = /^data:([^;,]+);base64,(.+)$/s;

export function parseLogoDataUrl(dataUrl: string): EncodedLogo | null {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  const mimeType = match?.[1];
  const base64 = match?.[2];
  if (!mimeType || !base64 || !isLogoMimeType(mimeType)) return null;
  return { mimeType, base64 };
}
