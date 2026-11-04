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

function collectMarkers(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') {
    const markers = [...value.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]).sort();
    return [`${prefix}:${markers.join(',')}`];
  }
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    collectMarkers(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('api lang/ markers', () => {
  it('es and en use the same {{markers}} in each key', () => {
    expect(collectMarkers(en).sort()).toEqual(collectMarkers(es).sort());
  });
});
