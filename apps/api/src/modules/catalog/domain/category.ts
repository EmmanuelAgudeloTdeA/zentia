import { normalizeCategoryLabel, toSearchKey } from '@zentia/shared';

export interface ResolvedCategory {
  category: string;
  categoryKey: string;
}

/** Si ya existe una categoría con la misma clave, se reutiliza su forma escrita. */
export function resolveCategory(label: string, existingLabel: string | null): ResolvedCategory {
  const category = normalizeCategoryLabel(label);
  return { category: existingLabel ?? category, categoryKey: toSearchKey(category) };
}
