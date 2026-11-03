import type { VatRate } from '@zentia/shared';
import { useEffect, useState } from 'react';
import { companyService } from '../../company-settings';

export const FALLBACK_VAT_RATE: VatRate = 'GENERAL_19';

/** IVA por defecto de la empresa (M2); si no se puede leer, 19 %. */
export function useDefaultVatRate(enabled: boolean): VatRate | null {
  const [rate, setRate] = useState<VatRate | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    companyService
      .getSettings()
      .then((settings) => !cancelled && setRate(settings.defaultVatRate))
      .catch(() => !cancelled && setRate(FALLBACK_VAT_RATE));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return rate;
}
