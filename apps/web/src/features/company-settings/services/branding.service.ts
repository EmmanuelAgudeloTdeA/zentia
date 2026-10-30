import { useBrandingStore } from '../../../core/branding';
import { companyService } from './company.service';

/** Carga el branding público al iniciar; si falla, el layout usa el nombre de la app. */
export async function loadBranding(): Promise<void> {
  try {
    useBrandingStore.getState().setBranding(await companyService.getBranding());
  } catch {
    useBrandingStore.getState().setBranding({});
  }
}
