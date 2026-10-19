export interface SecureTokenGenerator {
  /** Token opaco aleatorio (base64url) para el refresh. */
  generate(): string;
  hash(raw: string): string;
  newId(): string;
}
