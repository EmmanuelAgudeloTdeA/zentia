import type { VatRate } from '@zentia/shared';

export interface Product {
  id: string;
  name: string;
  category: string;
  /** COP sin IVA como string entero canónico. */
  price: string;
  vatRate: VatRate;
  isActive: boolean;
  updatedAt: Date;
}
