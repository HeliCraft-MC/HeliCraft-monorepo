import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '../../db';
import { states, users, stateFounders } from '../../db/schema';
import type { StateConfiguration } from './contracts';
import type { Principal } from '../identity/contracts';
import type { Locale } from '../localized-content/contracts';
import { StateService } from './service';
import { renderConstitution } from './constitution-renderer';

async function previewConstitution(
  db: Database['db'],
  configuration: StateConfiguration,
  context: Readonly<{ principal: Principal; locale: Locale }>,
): Promise<Awaited<ReturnType<typeof renderConstitution>>> {
  const { principal, locale } = context;
  const [record] = await db
    .select({ id: states.id, status: states.status })
    .from(states)
    .where(eq(states.slug, configuration.slug));
  let primaryId = principal.id;
  if (record) {
    await new StateService(db).detail(
      record.id,
      locale,
      record.status === 'ACTIVE'
        ? {}
        : { actorId: principal.id, admin: principal.permissions.includes('states.manage') },
    );
    const [primary] = await db
      .select({ id: stateFounders.userId })
      .from(stateFounders)
      .where(and(eq(stateFounders.stateId, record.id), eq(stateFounders.type, 'PRIMARY')));
    primaryId = primary?.id ?? principal.id;
  }
  const people = await db
    .select({ id: users.id, name: users.username })
    .from(users)
    .where(inArray(users.id, [primaryId, ...configuration.cofounderIds]));
  const founders = people.map((person) => ({
    id: person.id,
    name: person.name,
    type: person.id === primaryId ? ('PRIMARY' as const) : ('COFOUNDER' as const),
  }));
  return await renderConstitution(configuration, founders, locale);
}
export { previewConstitution };
