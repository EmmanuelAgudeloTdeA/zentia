import type { LogoMimeType } from '@zentia/shared';
import type { ImageInspector } from '../application/index.js';

const SIGNATURES: ReadonlyArray<{ mimeType: LogoMimeType; bytes: readonly number[] }> = [
  { mimeType: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mimeType: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
];

export class SignatureImageInspector implements ImageInspector {
  detect(bytes: Uint8Array): LogoMimeType | null {
    const match = SIGNATURES.find(({ bytes: signature }) =>
      signature.every((byte, index) => bytes[index] === byte),
    );
    return match?.mimeType ?? null;
  }
}
