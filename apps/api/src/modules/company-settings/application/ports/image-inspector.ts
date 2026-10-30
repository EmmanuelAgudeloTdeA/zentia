import type { LogoMimeType } from '@zentia/shared';

export interface ImageInspector {
  /** Tipo según la firma de los primeros bytes, o null si no es PNG ni JPEG. */
  detect(bytes: Uint8Array): LogoMimeType | null;
}
