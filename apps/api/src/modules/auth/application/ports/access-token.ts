export type AccessTokenVerification =
  { ok: true; userId: string } | { ok: false; reason: 'expired' | 'invalid' };

export interface AccessTokenSigner {
  sign(userId: string): Promise<string>;
}

export interface AccessTokenVerifier {
  verify(token: string): Promise<AccessTokenVerification>;
}
