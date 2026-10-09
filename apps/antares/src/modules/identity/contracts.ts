import { z } from '@hono/zod-openapi';

const MIN_USERNAME = 3;
const MAX_USERNAME = 16;
const MIN_PASSWORD = 12;
const MAX_PASSWORD = 128;
const reserved = new Set([
  'admin',
  'administrator',
  'owner',
  'moderator',
  'helicraft',
  'system',
  'support',
  'root',
  'console',
  'antares',
  'vega',
]);
const UsernameSchema = z
  .string()
  .min(MIN_USERNAME)
  .max(MAX_USERNAME)
  .regex(/^[A-Za-z0-9_]+$/u)
  .refine((name) => !reserved.has(name.toLowerCase()), 'Это имя зарезервировано');
const PasswordSchema = z.string().min(MIN_PASSWORD).max(MAX_PASSWORD);
const CredentialsSchema = z.strictObject({ username: UsernameSchema, password: PasswordSchema });
// Login accepts reserved historical names and never trims or silently truncates passwords.
const LoginSchema = z.strictObject({
  username: z.string().min(1).max(MAX_USERNAME),
  password: z.string().min(1).max(MAX_PASSWORD),
});
const RoleSchema = z.enum(['PLAYER', 'EDITOR', 'MODERATOR', 'ADMIN', 'OWNER']);
const PrincipalSchema = z
  .object({
    id: z.uuid(),
    username: z.string(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
    createdAt: z.iso.datetime(),
    currentSkinId: z.uuid().nullable(),
    roles: z.array(RoleSchema),
    permissions: z.array(z.string()),
  })
  .openapi('Principal');
type Principal = z.infer<typeof PrincipalSchema>;
const RenameSchema = z.strictObject({
  username: UsernameSchema,
  currentPassword: z.string().min(1).max(MAX_PASSWORD),
});
const ChangePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1).max(MAX_PASSWORD),
  password: PasswordSchema,
});

export {
  UsernameSchema,
  PasswordSchema,
  CredentialsSchema,
  LoginSchema,
  RoleSchema,
  PrincipalSchema,
  type Principal,
  RenameSchema,
  ChangePasswordSchema,
};
