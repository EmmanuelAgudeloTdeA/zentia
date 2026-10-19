import type { LoginRequest } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import type { AuthDependencies } from './auth-dependencies.js';
import { issueSession, type IssuedSession } from './session.js';

export class LoginUseCase {
  private dummyHash: Promise<string> | undefined;

  constructor(private readonly deps: AuthDependencies) {}

  async execute({ email, password }: LoginRequest): Promise<IssuedSession> {
    const user = await this.deps.users.findByEmail(email);
    // Sin usuario se verifica contra un hash ficticio para igualar tiempos y no revelar si existe.
    const hash = user?.passwordHash ?? (await this.getDummyHash());
    const valid = await this.deps.hasher.verify(password, hash);
    if (!user || !valid || !user.isActive) throw new AppError('INVALID_CREDENTIALS', 401);

    const now = this.deps.clock.now();
    const staleBefore = new Date(now.getTime() - this.deps.refreshTokenTtlSeconds * 1000);
    return this.deps.unitOfWork.run(async ({ refreshTokens }) => {
      await refreshTokens.deleteStale(user.id, staleBefore);
      return issueSession(this.deps, user, { refreshTokens });
    });
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.deps.hasher.hash(this.deps.secureTokens.generate());
    return this.dummyHash;
  }
}
