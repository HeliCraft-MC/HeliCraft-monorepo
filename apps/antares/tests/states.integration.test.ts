// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
// oxlint-disable max-lines-per-function, max-statements, max-lines -- A real PostgreSQL scenario exercises atomic creation, authorization and history together.
import { assertPublicProfile } from './player-profile-scenario';
import { assertDirectory, assertDirectoryOrdering } from './state-directory-scenario';
import { officeReform, citizenReform, officeIdentityScenario } from './state-reform-scenario';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { createDatabase } from '../src/db';
import {
  states,
  userRoles,
  stateGovernanceRevisions,
  stateMemberships,
  votingEligibleVoters,
} from '../src/db/schema';
import { SessionService } from '../src/modules/sessions/service';
import { IdentityService } from '../src/modules/identity/service';
import { createApp } from '../src/app';
import { DraftSchema } from '../src/modules/states/contracts';
import { applyPreset } from '../src/modules/states/presets';
import { StateService } from '../src/modules/states/service';
import { StateDraftService } from '../src/modules/states/drafts';
import { StateReformService } from '../src/modules/states/reforms';
import { VotingService } from '../src/modules/voting/service';
import type { VotingInput } from '../src/modules/voting/contracts';

const ORIGIN = 'https://helicraft.test';
describe('states on PostgreSQL', () => {
  it('isolates drafts, detects conflicts, materializes atomically, reviews states and pins immutable history', async () => {
    const container = await new PostgreSqlContainer('postgis/postgis:18-3.6')
      .withDatabase('helicraft')
      .start();
    const database = createDatabase(container.getConnectionUri());
    try {
      await migrate(database.db, { migrationsFolder: './drizzle' });
      const identity = new IdentityService(database.db);
      const ownerToken = await identity.register('StateFounder', 'A sufficiently long password');
      const otherToken = await identity.register('StateCofounder', 'A sufficiently long password');
      const adminToken = await identity.register('StateReviewer', 'A sufficiently long password');
      const sessions = new SessionService(database.db);
      const owner = await sessions.authenticate(ownerToken);
      const other = await sessions.authenticate(otherToken);
      const admin = await sessions.authenticate(adminToken);
      await database.db.insert(userRoles).values({ userId: admin.principal.id, role: 'ADMIN' });
      const app = createApp({
        db: database.db,
        siteOrigin: ORIGIN,
        checkReady: async () => {
          await database.db.execute(sql`select 1`);
        },
      });
      const headers = {
        Origin: ORIGIN,
        Cookie: `helicraft_session=${ownerToken}`,
        'Content-Type': 'application/json',
      };
      const path = '/api/v1/account/state-drafts';
      const created = await app.request(path, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: 'Aurora' }),
      });
      const draft = DraftSchema.parse(await created.json());
      expect(created.status).toBe(200);
      expect(
        (
          await app.request(`${path}/${draft.id}`, {
            headers: { ...headers, Cookie: `helicraft_session=${otherToken}` },
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await app.request(`${path}/${draft.id}/submit`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ version: 1 }),
          })
        ).status,
      ).toBe(400);
      expect(await database.db.select().from(states)).toHaveLength(0);
      const drafts = new StateDraftService(database.db);
      const disposable = await drafts.create(owner.principal.id, 'Delete me');
      await expect(
        drafts.save(disposable.id, other.principal.id, {
          version: 1,
          title: 'Intrusion',
          step: 1,
          configuration: disposable.configuration,
        }),
      ).rejects.toThrow('не найден');
      await expect(drafts.remove(disposable.id, other.principal.id, 1)).rejects.toThrow(
        'не найден',
      );
      expect((await drafts.get(disposable.id, owner.principal.id)).title).toBe('Delete me');
      await drafts.remove(disposable.id, owner.principal.id, 1);
      await expect(drafts.get(disposable.id, owner.principal.id)).rejects.toThrow('не найден');
      const configuration = {
        ...draft.configuration,
        slug: 'aurora',
        name: { ru: 'Аврора', en: 'Aurora' },
        cofounderIds: [other.principal.id],
        governance: applyPreset('AUTOCRACY', owner.principal.id),
        constitution: {
          title: { en: 'Constitution' },
          blocks: [
            {
              id: crypto.randomUUID(),
              type: 'GENERATED',
              kind: 'GOVERNANCE_SUMMARY',
              officeId: null,
              action: null,
            },
            {
              id: crypto.randomUUID(),
              type: 'MARKDOWN',
              content: { en: '# Rights\n<script>alert(1)</script>' },
            },
          ],
        },
      };
      const saveBody = { version: draft.version, title: 'Aurora', step: 12, configuration };
      const saved = DraftSchema.parse(
        await (
          await app.request(`${path}/${draft.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(saveBody),
          })
        ).json(),
      );
      expect(saved.version).toBe(2);
      expect(
        (
          await app.request(`${path}/${draft.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(saveBody),
          })
        ).status,
      ).toBe(409);
      const service = new StateService(database.db);
      const stateId = await service.submit(draft.id, owner.principal.id, saved.version);
      const state = await service.detail(stateId, 'en', { actorId: owner.principal.id });
      const collisionResponse = await app.request(path, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: 'Collision' }),
      });
      const collision = DraftSchema.parse(await collisionResponse.json());
      await app.request(`${path}/${collision.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...saveBody,
          version: collision.version,
          configuration: { ...configuration, slug: 'collision' },
        }),
      });
      await expect(service.submit(collision.id, owner.principal.id, 2)).rejects.toThrow(
        'другому государству',
      );
      expect(await database.db.select().from(states)).toHaveLength(1);
      expect(state.status).toBe('CREATED');
      const rejectedDraft = await drafts.create(owner.principal.id, 'Rejected candidate');
      const rejectedSaved = await drafts.save(rejectedDraft.id, owner.principal.id, {
        version: 1,
        step: 12,
        title: 'Rejected candidate',
        configuration: {
          ...state.configuration,
          slug: 'rejected-candidate',
          governance: applyPreset('AUTOCRACY', owner.principal.id),
        },
      });
      const rejectedId = await service.submit(
        rejectedDraft.id,
        owner.principal.id,
        rejectedSaved.version,
      );
      await service.changeStatus(rejectedId, admin.principal.id, {
        status: 'REJECTED',
        reason: 'Rejected in review',
      });
      expect((await service.detail(rejectedId, 'en', { actorId: owner.principal.id })).status).toBe(
        'REJECTED',
      );
      expect((await app.request('/api/v1/public/states/rejected-candidate')).status).toBe(404);
      expect(state.citizens).toHaveLength(2);
      expect(state.holders).toHaveLength(1);
      expect(state.constitutionHtml[0]?.html).not.toContain('<script');
      expect((await app.request('/api/v1/public/states/aurora')).status).toBe(404);
      await assertPublicProfile(app, owner.principal.id, {
        name: 'StateFounder',
        stateVisible: false,
      });
      await assertDirectory(app, 0);
      await expect(
        service.changeStatus(stateId, other.principal.id, { status: 'ACTIVE', reason: 'Reviewed' }),
      ).rejects.toThrow('полномочий');
      await service.changeStatus(stateId, admin.principal.id, {
        status: 'ACTIVE',
        reason: 'Reviewed',
      });
      expect((await app.request('/api/v1/public/states/aurora?locale=en')).status).toBe(200);
      await assertPublicProfile(app, owner.principal.id, {
        name: 'StateFounder',
        stateVisible: true,
        office: 'Leader',
      });
      await assertDirectory(app, 1);
      await assertDirectoryOrdering(database.db, app, {
        ownerId: owner.principal.id,
        adminId: admin.principal.id,
      });
      const amended = structuredClone(state.configuration);
      const [office] = amended.governance.offices;
      if (!office) {
        throw new Error('Initial office missing');
      }
      office.name = { en: 'New office title' };
      await new StateReformService(database.db).adminOverride(
        {
          stateId,
          configuration: amended,
          reason: 'Correct office title',
          baseRevisionId: state.governanceRevisionId,
        },
        admin.principal.id,
      );
      expect(
        (
          await service.detail(stateId, 'en', {
            actorId: owner.principal.id,
            revisionId: state.governanceRevisionId,
          })
        ).configuration.governance.offices[0]?.name.en,
      ).toBe('Leader');
      expect(
        (await service.detail(stateId, 'en')).configuration.governance.offices[0]?.name.en,
      ).toBe('New office title');
      expect(
        await database.db
          .select()
          .from(stateGovernanceRevisions)
          .where(eq(stateGovernanceRevisions.stateId, stateId)),
      ).toHaveLength(2);
      const historicDocument = await service.detail(stateId, 'en', {
        actorId: owner.principal.id,
        revisionId: state.governanceRevisionId,
      });
      expect(historicDocument.constitutionHtml.map((block) => block.html).join('')).toContain(
        'Leader',
      );
      expect(historicDocument.constitutionHtml.map((block) => block.html).join('')).not.toContain(
        'New office title',
      );
      const currentDocument = await service.detail(stateId, 'en');
      expect(currentDocument.constitutionHtml.map((block) => block.html).join('')).toContain(
        'New office title',
      );
      await assertPublicProfile(app, owner.principal.id, {
        name: 'StateFounder',
        stateVisible: true,
        office: 'New office title',
      });
      const reformScenario = {
        stateId,
        founderId: owner.principal.id,
        citizenId: other.principal.id,
        adminId: admin.principal.id,
      };
      await officeReform(database.db, reformScenario);
      await citizenReform(database.db, reformScenario);
      await officeIdentityScenario(database.db, reformScenario);
      await service.changeStatus(stateId, admin.principal.id, {
        status: 'SUSPENDED',
        reason: 'Review required',
      });
      expect((await app.request('/api/v1/public/states/aurora')).status).toBe(404);
      await assertPublicProfile(app, owner.principal.id, {
        name: 'StateFounder',
        stateVisible: false,
      });
      await assertDirectory(app, 0);
      await service.changeStatus(stateId, admin.principal.id, {
        status: 'ACTIVE',
        reason: 'Restored',
      });
      await expect(
        service.changeStatus(stateId, admin.principal.id, {
          status: 'REJECTED',
          reason: 'Invalid',
        }),
      ).rejects.toThrow('Недопустимый');
      expect(
        DraftSchema.parse(await (await app.request(`${path}/${draft.id}`, { headers })).json())
          .submittedStateId,
      ).toBe(stateId);
      const voting = new VotingService(database.db);
      const yes = crypto.randomUUID();
      const input: VotingInput = {
        title: { en: 'State vote' },
        description: {},
        options: [
          { id: yes, label: { en: 'Yes' } },
          { id: crypto.randomUUID(), label: { en: 'No' } },
        ],
        opensAt: new Date(Date.now() - 1000).toISOString(),
        closesAt: new Date(Date.now() + 60_000).toISOString(),
        electorate: { type: 'STATE_CITIZENS', stateId },
        rules: state.configuration.governance.votingDefaults,
        maxSelections: 1,
        resultVisibility: 'PUBLIC',
      };
      const pollId = await voting.create(admin.principal.id, input);
      await voting.publish(pollId, admin.principal.id);
      await database.db
        .update(stateMemberships)
        .set({ endedAt: new Date() })
        .where(eq(stateMemberships.userId, other.principal.id));
      expect(
        await database.db
          .select()
          .from(votingEligibleVoters)
          .where(eq(votingEligibleVoters.votingId, pollId)),
      ).toHaveLength(2);
      await voting.cast(pollId, other.principal.id, { choices: [yes], abstain: false });
      await expect(
        voting.cast(pollId, other.principal.id, { choices: [yes], abstain: false }),
      ).rejects.toThrow('уже принят');
      await expect(
        voting.cast(pollId, admin.principal.id, { choices: [yes], abstain: false }),
      ).rejects.toThrow('избирателей');
      const globalId = await voting.create(admin.principal.id, {
        ...input,
        electorate: { type: 'GLOBAL_USERS' },
      });
      await voting.publish(globalId, admin.principal.id);
      await voting.cast(globalId, admin.principal.id, { choices: [yes], abstain: false });
      expect((await voting.detail(globalId, admin.principal.id, false)).hasVoted).toBe(true);
    } finally {
      await database.pool.end();
      await container.stop();
    }
  });
});
