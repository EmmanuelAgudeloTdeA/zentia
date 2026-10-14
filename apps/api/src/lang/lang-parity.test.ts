import { describe, expect, it } from 'vitest';
import en from './en.json' with { type: 'json' };
import es from './es.json' with { type: 'json' };

function collectKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  const entries = Object.entries(value);
  if (entries.length === 0) return [prefix];
  return entries.flatMap(([key, child]) => collectKeys(child, prefix ? `${prefix}.${key}` : key));
}

describe('api lang/', () => {
  it('es and en have the same keys', () => {
    expect(collectKeys(en).sort()).toEqual(collectKeys(es).sort());
  });
});
