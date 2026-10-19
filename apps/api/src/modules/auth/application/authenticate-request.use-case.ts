import { AppError } from '../../../core/http/index.js';
import { toActor, type Actor } from '../domain/index.js';
import type { AuthDependencies } from './auth-dependencies.js';

export class AuthenticateRequestUseCase {
  constructor(private readonly deps: Pick<AuthDependencies, 'accessTokens' | 'users'>) {}

  async execute(token: string): Promise<Actor> {
    const result = await this.deps.accessTokens.verify(token);
    if (!result.ok) {
      throw new AppError(result.reason === 'expired' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID', 401);
    }
    const user = await this.deps.users.findById(result.userId);
    if (!user?.isActive) throw new AppError('USER_INACTIVE', 401);
    return toActor(user);
  }
}
