import type { roleName } from '../../db/schema';
import { HTTP, DomainError } from '../errors';

type Role = (typeof roleName.enumValues)[number];
type Permission =
  | 'users.read'
  | 'users.status.manage'
  | 'users.sessions.revoke'
  | 'users.roles.manage'
  | 'content.read'
  | 'content.write'
  | 'content.publish'
  | 'audit.read';
const editorial: readonly Permission[] = ['content.read', 'content.write', 'content.publish'];
const moderation: readonly Permission[] = [
  'users.read',
  'users.status.manage',
  'users.sessions.revoke',
];
const grants: Record<Role, readonly Permission[]> = {
  PLAYER: [],
  EDITOR: editorial,
  MODERATOR: moderation,
  ADMIN: [...editorial, ...moderation, 'users.roles.manage', 'audit.read'],
  OWNER: [...editorial, ...moderation, 'users.roles.manage', 'audit.read'],
};
function permissionsFor(roles: readonly Role[]): Permission[] {
  return [...new Set(roles.flatMap((role) => grants[role]))];
}
function requirePermission(roles: readonly Role[], permission: Permission): void {
  if (!permissionsFor(roles).includes(permission)) {
    throw new DomainError(HTTP.forbidden, 'FORBIDDEN', 'Недостаточно полномочий');
  }
}

export { type Role, type Permission, permissionsFor, requirePermission };
