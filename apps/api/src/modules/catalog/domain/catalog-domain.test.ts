import { describe, expect, it } from 'vitest';
import { resolveCategory } from './category.js';

describe('resolveCategory', () => {
  it('reuses the existing written form for the same key', () => {
    expect(resolveCategory(' tecnologia ', 'Tecnología')).toEqual({
      category: 'Tecnología',
      categoryKey: 'tecnologia',
    });
  });

  it('normalizes a new category', () => {
    expect(resolveCategory('  Servicios   de TI ', null)).toEqual({
      category: 'Servicios de TI',
      categoryKey: 'servicios de ti',
    });
  });
});
