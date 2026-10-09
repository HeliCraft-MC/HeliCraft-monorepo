import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createDatabase } from '../src/db';
import { users, userRoles, adminAuditLog } from '../src/db/schema';

const id = z.uuid().parse(process.argv[2]);
if (process.argv[3] !== '--confirm' || process.argv[4] !== id) {
  throw new Error('Usage: bun run admin:bootstrap-owner <UUID> --confirm <same UUID>');
}
const url = z.url().parse(process.env.DATABASE_URL);
if (new URL(url).pathname !== '/helicraft') {
  throw new Error('Bootstrap requires the helicraft database');
}
const { db, pool } = createDatabase(url);
try {
  await db.transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(741022)`);
    const [user] = await transaction
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.status, 'ACTIVE')))
      .for('update');
    if (!user) {
      throw new Error('Register an ACTIVE web account first');
    }
    const owners = await transaction.select().from(userRoles).where(eq(userRoles.role, 'OWNER'));
    if (owners.some((owner) => owner.userId === id)) {
      return;
    }
    if (owners.length > 0) {
      throw new Error('An OWNER already exists; use authorized administration to appoint another');
    }
    await transaction.insert(userRoles).values({ userId: id, role: 'OWNER' });
    await transaction
      .insert(adminAuditLog)
      .values({ actorId: id, action: 'owner.bootstrap', targetType: 'user', targetId: id });
  });
  console.info(`Owner bootstrap verified for ${id}`);
} finally {
  await pool.end();
}
