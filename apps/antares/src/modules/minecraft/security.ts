import { timingSafeEqual } from 'node:crypto';
import type { Context } from 'hono';
import { DomainError, HTTP } from '../errors';
import { tokenHash } from '../sessions/service';
import type { ServiceActor } from './contracts';

function serviceActor(
  context: Context,
  actors: readonly ServiceActor[],
  role: ServiceActor['role'],
): ServiceActor {
  const authorization = context.req.header('authorization') ?? '';
  if (context.req.header('cookie') !== undefined || !authorization.startsWith('Bearer ')) {
    throw new DomainError(
      HTTP.unauthenticated,
      'SERVICE_UNAUTHENTICATED',
      'Service authentication required',
    );
  }
  const digest = Buffer.from(tokenHash(authorization.slice('Bearer '.length)));
  const actor = actors.find((candidate) =>
    timingSafeEqual(digest, Buffer.from(tokenHash(candidate.token))),
  );
  if (!actor) {
    throw new DomainError(
      HTTP.unauthenticated,
      'SERVICE_UNAUTHENTICATED',
      'Invalid service credential',
    );
  }
  if (actor.role !== role) {
    throw new DomainError(HTTP.forbidden, 'SERVICE_FORBIDDEN', 'Service operation is not allowed');
  }
  return actor;
}
export { serviceActor };
