import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { errors, jwtVerify, SignJWT } from 'jose';
import type {
  AccessTokenSigner,
  AccessTokenVerification,
  AccessTokenVerifier,
  PasswordHasher,
  SecureTokenGenerator,
} from '../application/index.js';

const ISSUER = 'zentia-api';
const AUDIENCE = 'zentia-web';

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly cost: number) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

export class JoseAccessTokens implements AccessTokenSigner, AccessTokenVerifier {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly ttlSeconds: number,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  sign(userId: string): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${this.ttlSeconds}s`)
      .sign(this.key);
  }

  async verify(token: string): Promise<AccessTokenVerification> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: AUDIENCE,
      });
      return payload.sub ? { ok: true, userId: payload.sub } : { ok: false, reason: 'invalid' };
    } catch (error) {
      return { ok: false, reason: error instanceof errors.JWTExpired ? 'expired' : 'invalid' };
    }
  }
}

export class CryptoSecureTokens implements SecureTokenGenerator {
  generate(): string {
    return randomBytes(32).toString('base64url');
  }

  hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  newId(): string {
    return randomUUID();
  }
}
