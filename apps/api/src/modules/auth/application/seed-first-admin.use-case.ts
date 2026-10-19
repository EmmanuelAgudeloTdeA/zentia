import { checkPasswordPolicy, emailSchema } from '@zentia/shared';
import type { PasswordHasher, UserRepository } from './ports/index.js';

export type SeedFirstAdminResult = 'created' | 'skipped';

interface SeedFirstAdminInput {
  email: string | undefined;
  password: string | undefined;
}

export class SeedFirstAdminUseCase {
  constructor(private readonly deps: { users: UserRepository; hasher: PasswordHasher }) {}

  async execute({ email, password }: SeedFirstAdminInput): Promise<SeedFirstAdminResult> {
    if (await this.deps.users.existsWithRole('ADMIN')) return 'skipped';
    if (!email || !password) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to create the first admin');
    }
    const normalizedEmail = emailSchema.parse(email);
    const failed = checkPasswordPolicy(password, normalizedEmail);
    if (failed.length > 0) {
      throw new Error(`ADMIN_PASSWORD does not meet the password policy: ${failed.join(', ')}`);
    }
    await this.deps.users.create({
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0] ?? normalizedEmail,
      passwordHash: await this.deps.hasher.hash(password),
      role: 'ADMIN',
      mustChangePassword: true,
    });
    return 'created';
  }
}
