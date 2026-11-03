import { z } from 'zod';
import { emailSchema, roleSchema, userDtoSchema } from './auth.schema.js';

export const USER_NAME_MAX_LENGTH = 100;
export const USERS_PAGE_SIZE = 20;
export const USERS_MAX_PAGE_SIZE = 100;

export const userNameSchema = z.string().trim().min(1).max(USER_NAME_MAX_LENGTH);

export const createUserRequestSchema = z.object({
  email: emailSchema,
  name: userNameSchema,
  role: roleSchema,
});

export type CreateUserRequest = z.input<typeof createUserRequestSchema>;

export const updateUserRequestSchema = z
  .object({
    email: emailSchema,
    name: userNameSchema,
    role: roleSchema,
    isActive: z.boolean(),
  })
  .partial();

export type UpdateUserRequest = z.input<typeof updateUserRequestSchema>;

export type UserChanges = z.output<typeof updateUserRequestSchema>;

export const listUsersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: roleSchema.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(USERS_MAX_PAGE_SIZE).default(USERS_PAGE_SIZE),
});

export type ListUsersQuery = z.input<typeof listUsersQuerySchema>;

export type UserListFilter = z.output<typeof listUsersQuerySchema>;

export const userListDtoSchema = z.object({
  items: z.array(userDtoSchema),
  total: z.int(),
  page: z.int(),
  pageSize: z.int(),
});

export type UserListDto = z.infer<typeof userListDtoSchema>;

export const userOptionDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
});

export const userOptionsQuerySchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type UserOptionDto = z.infer<typeof userOptionDtoSchema>;

export const temporaryPasswordResultSchema = z.object({
  temporaryPassword: z.string(),
});

export type TemporaryPasswordResult = z.infer<typeof temporaryPasswordResultSchema>;

export const createUserResultSchema = z.object({
  user: userDtoSchema,
  temporaryPassword: z.string(),
});

export type CreateUserResult = z.infer<typeof createUserResultSchema>;
