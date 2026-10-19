import type { AuthDependencies } from './auth-dependencies.js';

export class LogoutUseCase {
  constructor(private readonly deps: AuthDependencies) {}

  async execute(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const record = await this.deps.refreshTokens.findByHash(this.deps.secureTokens.hash(rawToken));
    if (record) await this.deps.refreshTokens.revokeFamily(record.familyId, this.deps.clock.now());
  }
}
