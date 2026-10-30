import type { LogoMimeType } from '@zentia/shared';

export interface ImageInspector {
  detect(bytes: Uint8Array): LogoMimeType | null;
}
