import { z } from 'zod';
import type { Principal } from '@helicraft/alhena';

const PrincipalSchema: z.ZodType<Principal> = z.object({
  id: z.uuid(),
  username: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']),
  createdAt: z.iso.datetime(),
  currentSkinId: z.uuid().nullable(),
  roles: z.array(z.enum(['PLAYER', 'EDITOR', 'MODERATOR', 'ADMIN', 'OWNER'])),
  permissions: z.array(z.string()),
});
function parsePrincipal(value: unknown): Principal {
  return PrincipalSchema.parse(value);
}
export { PrincipalSchema, parsePrincipal };
