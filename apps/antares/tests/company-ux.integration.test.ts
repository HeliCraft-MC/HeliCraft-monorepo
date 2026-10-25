// oxlint-disable import/max-dependencies -- The integration lifecycle crosses real participant, Governance, storage and public identity boundaries.
// oxlint-disable max-lines-per-function -- Keep exact consent invalidation and publication privacy assertions in their complete disposable lifecycles.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { z } from '@hono/zod-openapi';
import { createCompanyUxFixture, auth, inbox } from './company-ux-fixture';
import type { CompanyUxFixture } from './company-ux-fixture';
import { officeCompanyConfiguration, submitPreparedCompany } from './companies-fixture';
import { CompanyDraftService } from '../src/modules/companies/drafts';
import { CompanyConsentService } from '../src/modules/companies/consents';
import { CompanyDecisionService } from '../src/modules/companies/decisions';
import { CompanyWorkspaceService } from '../src/modules/companies/workspace-read';
import { MonetaryDirectiveService } from '../src/modules/monetary/directives';
import { FormationProgressSchema } from '../src/modules/companies/formation-progress';
import { PublishedCompanyIdentitySchema } from '../src/modules/companies/public-contracts';

let context: CompanyUxFixture | null = null;
function fixture(): CompanyUxFixture {
  if (context === null) {
    throw new Error('Fixture unavailable');
  }
  return context;
}
beforeAll(async () => {
  context = await createCompanyUxFixture();
});
afterAll(async () => {
  if (context !== null) {
    context.storage.destroy();
    await context.fixture.db.pool.end();
    await context.fixture.container.stop();
    await context.media.stop();
  }
});

describe('company approval inbox and branding', () => {
  it('discovers invitations only for the selected participants, clears confirmed actions and invalidates them after exact terms change', async () => {
    const data = fixture();
    const drafts = new CompanyDraftService(data.fixture.db.db);
    const initial = await drafts.create(data.ownerId, 'Participant invitation');
    const configuration = officeCompanyConfiguration(
      data.fixture.first.citizenId,
      data.fixture.first.stateId,
    );
    const draft = await drafts.save(initial.id, data.ownerId, {
      version: initial.version,
      step: 1,
      title: initial.title,
      configuration,
    });
    expect((await data.app.request('/api/v1/account/company-inbox?kind=FORMATION')).status).toBe(
      401,
    );
    expect((await inbox(data, data.outsiderToken, 'FORMATION')).items).toHaveLength(0);
    expect(
      (await inbox(data, data.citizenToken, 'FORMATION')).items.map((item) => item.action),
    ).toEqual(['FOUNDER_CONSENT', 'OFFICE_CONSENT']);
    const path = `/api/v1/account/company-drafts/${draft.id}/progress`;
    expect((await data.app.request(path, { headers: auth(data.outsiderToken) })).status).toBe(404);
    const consent = new CompanyConsentService(data.fixture.db.db);
    await consent.grant(draft.id, data.fixture.first.citizenId, {
      role: 'FOUNDER',
      formationHash: draft.formationHash,
      idempotencyKey: crypto.randomUUID(),
    });
    expect(
      (await inbox(data, data.citizenToken, 'FORMATION')).items.map((item) => item.action),
    ).toEqual(['OFFICE_CONSENT']);
    await consent.grant(draft.id, data.fixture.first.citizenId, {
      role: 'OFFICE_HOLDER',
      formationHash: draft.formationHash,
      idempotencyKey: crypto.randomUUID(),
    });
    expect((await inbox(data, data.citizenToken, 'FORMATION')).items).toHaveLength(0);
    const progress = FormationProgressSchema.parse(
      await (await data.app.request(path, { headers: auth(data.ownerToken) })).json(),
    );
    expect(progress.items.every((item) => item.confirmed)).toBe(true);
    await drafts.save(draft.id, data.ownerId, {
      version: draft.version,
      step: draft.step,
      title: draft.title,
      configuration: { ...draft.configuration, name: { en: 'Revised exact terms' } },
    });
    expect((await inbox(data, data.citizenToken, 'FORMATION')).items).toHaveLength(2);
    const changed = FormationProgressSchema.parse(
      await (await data.app.request(path, { headers: auth(data.ownerToken) })).json(),
    );
    expect(changed.items.every((item) => !item.confirmed)).toBe(true);
  });
  it('routes state founder consent through actual Governance and removes the request after execution', async () => {
    const data = fixture();
    const drafts = new CompanyDraftService(data.fixture.db.db);
    const initial = await drafts.create(data.ownerId, 'State founder invitation');
    const base = officeCompanyConfiguration(data.ownerId, data.fixture.first.stateId);
    const draft = await drafts.save(initial.id, data.ownerId, {
      version: initial.version,
      step: 1,
      title: initial.title,
      configuration: {
        ...base,
        allocations: [
          { owner: { type: 'STATE', id: data.fixture.first.stateId }, shares: base.totalShares },
        ],
      },
    });
    const tasks = await inbox(data, data.stateToken, 'FORMATION');
    expect(tasks.items).toContainEqual(
      expect.objectContaining({
        href: `/app/states/${data.fixture.first.stateId}/manage?section=companies&formationDraftId=${draft.id}`,
        action: 'FOUNDER_CONSENT',
      }),
    );
    expect(
      (await inbox(data, data.citizenToken, 'FORMATION')).items.some((item) =>
        item.id.startsWith(draft.id),
      ),
    ).toBe(false);
    const directives = new MonetaryDirectiveService(data.fixture.db.db);
    const id = await directives.create(
      data.fixture.first.stateId,
      { id: data.fixture.first.founderId, admin: false },
      {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'CONSENT_COMPANY_FORMATION',
          companyId: draft.companyId,
          formationHash: draft.formationHash,
        },
      },
    );
    expect(
      (await directives.detail(id, { id: data.fixture.first.founderId, admin: false })).status,
    ).toBe('APPLIED');
    expect(
      (await inbox(data, data.stateToken, 'FORMATION')).items.some((item) =>
        item.id.startsWith(draft.id),
      ),
    ).toBe(false);
    expect(
      (
        await data.app.request(`/api/v1/account/monetary/directives/${id}`, {
          headers: auth(data.outsiderToken),
        })
      ).status,
    ).toBe(404);
  });
  it('stores square logos and covers privately, publishes approved branding and rejects assets from another company', async () => {
    const data = fixture();
    const { db } = data.fixture.db;
    const drafts = new CompanyDraftService(db);
    const initial = await drafts.create(data.ownerId, 'Branded company');
    const image = await sharp({
      create: { width: 720, height: 360, channels: 3, background: '#338899' },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.set('file', new File([image], 'brand.png', { type: 'image/png' }));
    const uploaded = await data.app.request(
      `/api/v1/account/companies/${initial.companyId}/media?kind=LOGO`,
      { method: 'POST', headers: auth(data.ownerToken), body: form },
    );
    expect(uploaded.status).toBe(200);
    const logo = z
      .object({ id: z.uuid(), width: z.number(), height: z.number() })
      .parse(await uploaded.json());
    expect(logo.width).toBe(logo.height);
    const privatePath = `/api/v1/account/companies/${initial.companyId}/media/${logo.id}`;
    const publicPath = `/api/v1/public/companies/${initial.companyId}/media/${logo.id}`;
    expect(
      (await data.app.request(privatePath, { headers: auth(data.outsiderToken) })).status,
    ).toBe(404);
    expect((await data.app.request(publicPath)).status).toBe(404);
    const coverResponse = await data.app.request(
      `/api/v1/account/companies/${initial.companyId}/media?kind=COVER`,
      { method: 'POST', headers: auth(data.ownerToken), body: form },
    );
    const cover = z.object({ id: z.uuid() }).parse(await coverResponse.json());
    const configuration = {
      ...officeCompanyConfiguration(data.ownerId, data.fixture.first.stateId),
      branding: { color: '#338899', logoMediaId: logo.id, coverMediaId: cover.id },
    };
    const draft = await drafts.save(initial.id, data.ownerId, {
      version: initial.version,
      title: initial.title,
      step: 1,
      configuration,
    });
    const consents = new CompanyConsentService(db);
    await Promise.all(
      (['FOUNDER', 'OFFICE_HOLDER'] as const).map(async (role) => {
        await consents.grant(draft.id, data.ownerId, {
          role,
          formationHash: draft.formationHash,
          idempotencyKey: crypto.randomUUID(),
        });
      }),
    );
    await submitPreparedCompany(db, draft);
    const published = PublishedCompanyIdentitySchema.parse(
      await (await data.app.request(`/api/v1/public/companies/${draft.companyId}/identity`)).json(),
    );
    expect(published.branding).toEqual(configuration.branding);
    expect((await data.app.request(publicPath)).headers.get('Content-Type')).toBe('image/webp');
    const workspace = await new CompanyWorkspaceService(db).detail(draft.companyId, {
      id: data.ownerId,
      admin: false,
    });
    const profileDecisionId = await new CompanyDecisionService(db).create(
      draft.companyId,
      { id: data.ownerId, admin: false },
      {
        revisionId: workspace.currentRevisionId,
        idempotencyKey: crypto.randomUUID(),
        payload: {
          kind: 'UPDATE_PROFILE',
          name: workspace.content.name,
          description: workspace.content.description,
          categories: [],
          branding: { color: '#992244', logoMediaId: logo.id, coverMediaId: null },
        },
      },
    );
    const updated = PublishedCompanyIdentitySchema.parse(
      await (await data.app.request(`/api/v1/public/companies/${draft.companyId}/identity`)).json(),
    );
    expect(updated.branding?.color).toBe('#992244');
    const decisionMedia = `/api/v1/account/company-decisions/${profileDecisionId}/media/${logo.id}`;
    expect((await data.app.request(decisionMedia, { headers: auth(data.ownerToken) })).status).toBe(
      200,
    );
    expect(
      (await data.app.request(decisionMedia, { headers: auth(data.outsiderToken) })).status,
    ).toBe(404);
    const submitted = await drafts.get(draft.id, data.ownerId);
    const applicationMedia = `/api/v1/account/company-applications/${submitted.submittedApplicationId}/media/${cover.id}`;
    expect(
      (await data.app.request(applicationMedia, { headers: auth(data.stateToken) })).status,
    ).toBe(200);
    expect(
      (await data.app.request(applicationMedia, { headers: auth(data.outsiderToken) })).status,
    ).toBe(404);
    expect(
      (await data.app.request(`/api/v1/public/companies/${draft.companyId}/media/${cover.id}`))
        .status,
    ).toBe(404);
    const foreign = await drafts.create(data.ownerId, 'Foreign asset attempt');
    const saved = await drafts.save(foreign.id, data.ownerId, {
      version: foreign.version,
      title: foreign.title,
      step: 1,
      configuration,
    });
    await Promise.all(
      (['FOUNDER', 'OFFICE_HOLDER'] as const).map(async (role) => {
        await consents.grant(saved.id, data.ownerId, {
          role,
          formationHash: saved.formationHash,
          idempotencyKey: crypto.randomUUID(),
        });
      }),
    );
    await expect(submitPreparedCompany(db, saved)).rejects.toMatchObject({
      code: 'COMPANY_MEDIA_UNAVAILABLE',
    });
  });
});
