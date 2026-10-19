import { describe, expect, it } from 'vitest';
import { BcryptPasswordHasher, CryptoSecureTokens, JoseAccessTokens } from './security-adapters.js';

const SECRET = 'test-secret-with-at-least-32-characters';

describe('BcryptPasswordHasher', () => {
  it('hashes and verifies', async () => {
    const hasher = new BcryptPasswordHasher(4);
    const hash = await hasher.hash('ventas2026x');
    expect(hash).not.toContain('ventas2026x');
    await expect(hasher.verify('ventas2026x', hash)).resolves.toBe(true);
    await expect(hasher.verify('otra2026xyz', hash)).resolves.toBe(false);
  });
});

describe('JoseAccessTokens', () => {
  it('signs a token whose only identity claim is sub', async () => {
    const tokens = new JoseAccessTokens(SECRET, 900);
    const token = await tokens.sign('user-1');
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString(),
    ) as Record<string, unknown>;

    expect(Object.keys(payload).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'sub']);
    await expect(tokens.verify(token)).resolves.toEqual({ ok: true, userId: 'user-1' });
  });

  it('distinguishes expired from invalid tokens', async () => {
    const expired = await new JoseAccessTokens(SECRET, -1).sign('user-1');
    const verifier = new JoseAccessTokens(SECRET, 900);
    await expect(verifier.verify(expired)).resolves.toEqual({ ok: false, reason: 'expired' });

    const foreign = await new JoseAccessTokens('another-secret-with-32-characters!!', 900).sign(
      'u',
    );
    await expect(verifier.verify(foreign)).resolves.toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('CryptoSecureTokens', () => {
  it('generates 32-byte opaque tokens and hashes them with SHA-256', () => {
    const tokens = new CryptoSecureTokens();
    const raw = tokens.generate();
    expect(Buffer.from(raw, 'base64url')).toHaveLength(32);
    expect(tokens.hash(raw)).toMatch(/^[0-9a-f]{64}$/);
    expect(tokens.generate()).not.toBe(raw);
  });
});
