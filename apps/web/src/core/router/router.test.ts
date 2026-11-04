import type { RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';
import { routes } from './router';

function paths(list: readonly RouteObject[]): string[] {
  return list.flatMap((route) => [
    ...(route.path ? [route.path] : []),
    ...paths(route.children ?? []),
  ]);
}

describe('router', () => {
  it('registers the routes of every feature', () => {
    expect(paths(routes)).toEqual(
      expect.arrayContaining([
        '/login',
        '/quotes',
        '/quotes/:id',
        '/orders',
        '/orders/:id',
        '/customers',
        '/products',
        '/notifications',
        '/users',
        '/settings',
      ]),
    );
  });
});
