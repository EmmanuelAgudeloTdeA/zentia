import type { BrandingDto } from '@zentia/shared';
import { create } from 'zustand';

export type BrandingStatus = 'loading' | 'ready';

interface BrandingState extends BrandingDto {
  status: BrandingStatus;
  setBranding: (branding: Partial<BrandingDto>) => void;
}

export const useBrandingStore = create<BrandingState>()((set) => ({
  name: null,
  hasLogo: false,
  logoVersion: 0,
  status: 'loading',
  setBranding: (branding) => set({ ...branding, status: 'ready' }),
}));

/** `?v=` invalida la caché del navegador cuando cambia el logo. */
export function logoUrl(logoVersion: number): string {
  return `/api/company/logo?v=${logoVersion}`;
}
