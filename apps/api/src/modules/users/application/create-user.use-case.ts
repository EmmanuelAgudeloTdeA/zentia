import type { CreateUserRequest, CreateUserResult } from '@zentia/shared';
import { AppError } from '../../../core/http/index.js';
import { toUserDto } from '../../auth/index.js';
import type { UsersDependencies } from './users-dependencies.js';

type CreateUserInput = Required<CreateUserRequest>;

export class CreateUserUseCase {
  constructor(
    private readonly deps: Pick<UsersDependencies, 'users' | 'hasher' | 'temporaryPasswords'>,
  ) {}

  async execute({ email, name, role }: CreateUserInput): Promise<CreateUserResult> {
    if (await this.deps.users.findByEmail(email)) throw new AppError('EMAIL_TAKEN', 409);
    const temporaryPassword = this.deps.temporaryPasswords.generate();
    const user = await this.deps.users.create({
      email,
      name,
      role,
      passwordHash: await this.deps.hasher.hash(temporaryPassword),
      mustChangePassword: true,
    });
    return { user: toUserDto(user), temporaryPassword };
  }
}
