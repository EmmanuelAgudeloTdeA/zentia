import { useBrandingStore } from '../../../core/branding';
import { companyService } from './company.service';

export async function loadBranding(): Promise<void> {
  try {
    useBrandingStore.getState().setBranding(await companyService.getBranding());
  } catch {
    useBrandingStore.getState().setBranding({});
  }
}
