import { describe, expect, it } from 'vitest';
import en from './en.json';
import es from './es.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...acc, [path]: value }
      : { ...acc, ...flatten(value, path) };
  }, {});
}

function markers(text: string): string[] {
  return (text.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((marker) => marker.replace(/\s/g, '')).sort();
}

describe('web lang/', () => {
  const flatEs = flatten(es);
  const flatEn = flatten(en);

  it('es and en have the same keys', () => {
    expect(Object.keys(flatEn).sort()).toEqual(Object.keys(flatEs).sort());
  });

  it('es and en use the same markers per key', () => {
    for (const [key, text] of Object.entries(flatEs)) {
      expect(markers(flatEn[key] ?? ''), key).toEqual(markers(text));
    }
  });
});
