import { z } from 'zod';
import { ROLES } from '../enums/index.js';
import { passwordSchema } from './password-policy.js';

export const roleSchema = z.enum(ROLES);

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const userDtoSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string(),
  role: roleSchema,
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
  createdAt: z.iso.datetime(),
});

export type UserDto = z.infer<typeof userDtoSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(1024),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authSessionSchema = z.object({
  accessToken: z.string(),
  user: userDtoSchema,
});

export type AuthSession = z.infer<typeof authSessionSchema>;

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: passwordSchema,
});

export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>;
