// oxlint-disable import/max-dependencies -- Real institutional setup exercises Governance, directives, normalized text and immutable SQL evidence.
// oxlint-disable max-lines-per-function -- Keep both establishments, rejection boundaries and pinned revision assertions in one disposable scenario.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createDatabase } from '../src/db';
import { institutionPolicyTexts, monetaryDirectives } from '../src/db/schema';
import { monetaryFixture } from './monetary-fixture';
import { StateReformService } from '../src/modules/states/reforms';
import { StateService } from '../src/modules/states/service';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { MonetaryService } from '../src/modules/monetary/service';
import type { Policy } from '../src/modules/states/contracts';

const actorPolicy = (officeId: string, action: Policy['action']): Policy => ({
  action,
  mechanism: 'SINGLE_OFFICE',
  officeIds: [officeId],
  vote: null,
  manualProcedure: {},
});
describe('initial institution procedures', () => {
  it('uses shared authority, scopes initial procedures and publishes immutable localized revisions atomically', async () => {
    const postgres = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(postgres.getConnectionUri());
    try {
      await migrate(database.db, { migrationsFolder: './drizzle' });
      const fixture = await monetaryFixture(database.db);
      const states = new StateService(database.db);
      const initial = await states.detail(fixture.stateId, 'en');
      const shared = actorPolicy(fixture.officeId, 'CREATE_INSTITUTION');
      await new StateReformService(database.db).adminOverride(
        {
          stateId: fixture.stateId,
          configuration: {
            ...initial.configuration,
            governance: {
              ...initial.configuration.governance,
              policies: [...initial.configuration.governance.policies, shared],
            },
          },
          baseRevisionId: initial.governanceRevisionId,
          reason: 'Reviewed shared institution authority fixture',
        },
        fixture.adminId,
      );
      const before = await states.detail(fixture.stateId, 'en');
      const directives = new MonetaryDirectiveService(database.db);
      const actor = { id: fixture.founderId, admin: false };
      await expect(
        directives.create(fixture.stateId, actor, {
          idempotencyKey: crypto.randomUUID(),
          payload: {
            kind: 'ESTABLISH_BANK',
            name: { en: 'Bank' },
            description: {},
            initialPolicies: [actorPolicy(fixture.officeId, 'AMEND_GOVERNANCE')],
          },
        }),
      ).rejects.toThrow('только процедуры');
      await expect(
        directives.create(fixture.stateId, actor, {
          idempotencyKey: crypto.randomUUID(),
          payload: {
            kind: 'ESTABLISH_BANK',
            name: { en: 'Bank' },
            description: {},
            initialPolicies: [actorPolicy(crypto.randomUUID(), 'CREATE_CURRENCY')],
          },
        }),
      ).rejects.toThrow('Проверьте процедуры');
      expect(
        (await new MonetaryService(database.db).state(fixture.stateId, actor)).bank,
      ).toBeNull();
      const initialPolicies: Policy[] = [
        actorPolicy(fixture.officeId, 'CREATE_CURRENCY'),
        {
          action: 'CHANGE_BANK_CHARTER',
          mechanism: 'MANUAL',
          officeIds: [],
          vote: null,
          manualProcedure: { en: 'Review the charter', ru: 'Проверить устав' },
        },
      ];
      const command = {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'ESTABLISH_BANK' as const,
          name: { en: 'Bank' },
          description: {},
          initialPolicies,
        },
      };
      const id = await directives.create(fixture.stateId, actor, command);
      expect(await directives.create(fixture.stateId, actor, command)).toBe(id);
      expect((await directives.detail(id, actor)).payload).toEqual(command.payload);
      const current = await states.detail(fixture.stateId, 'en');
      expect(current.governanceRevision).toBe(before.governanceRevision + 1);
      expect(
        current.configuration.governance.policies.find(
          (policy) => policy.action === 'CHANGE_BANK_CHARTER',
        )?.manualProcedure,
      ).toEqual({ en: 'Review the charter', ru: 'Проверить устав' });
      const historical = await states.detail(fixture.stateId, 'en', {
        actorId: fixture.founderId,
        revisionId: before.governanceRevisionId,
      });
      expect(
        historical.configuration.governance.policies.some(
          (policy) => policy.action === 'CREATE_CURRENCY',
        ),
      ).toBe(false);
      const [stored] = await database.db
        .select()
        .from(monetaryDirectives)
        .where(eq(monetaryDirectives.id, id));
      expect(stored?.payload).toMatchObject({
        initialPolicies: [{ manualProcedure: {} }, { manualProcedure: {} }],
      });
      await expect(
        database.db.execute(
          sql`update institution_policy_texts set action = 'ENACT_LAW' where directive_id = ${id}`,
        ),
      ).rejects.toThrow();
      expect(
        await database.db
          .select()
          .from(institutionPolicyTexts)
          .where(eq(institutionPolicyTexts.directiveId, id)),
      ).toHaveLength(2);
      await expect(
        directives.create(fixture.stateId, actor, {
          idempotencyKey: crypto.randomUUID(),
          payload: {
            kind: 'ESTABLISH_TAX_OFFICE',
            name: { en: 'Tax office' },
            description: {},
            initialPolicies: [
              { ...shared, action: 'ENACT_LAW', mechanism: 'CITIZEN_VOTE', officeIds: [] },
            ],
          },
        }),
      ).rejects.toThrow('только через реформу');
      const tax = await directives.create(fixture.stateId, actor, {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'ESTABLISH_TAX_OFFICE',
          name: { en: 'Tax office' },
          description: {},
          initialPolicies: [actorPolicy(fixture.officeId, 'AMEND_TAX_LAW')],
        },
      });
      expect((await directives.detail(tax, actor)).status).toBe('APPLIED');
      expect(
        (await states.detail(fixture.stateId, 'en')).configuration.governance.policies.some(
          (policy) => policy.action === 'AMEND_TAX_LAW',
        ),
      ).toBe(true);
    } finally {
      await database.pool.end();
      await postgres.stop();
    }
  });
});
