import type { Database } from '../src/db';
import { IdentityService } from '../src/modules/identity/service';
import { SessionService } from '../src/modules/sessions/service';
import { StateDraftService } from '../src/modules/states/drafts';
import { StateService } from '../src/modules/states/service';
import { applyPreset } from '../src/modules/states/presets';

const EXTRA_CITIZENS = 10;
async function createPaginationFixture(db: Database['db'], ownerId: string): Promise<void> {
  const identity = new IdentityService(db);
  const sessions = new SessionService(db);
  const citizens = await Promise.all(
    Array.from({ length: EXTRA_CITIZENS }, async (_value, index) => {
      const token = await identity.register(`PageCitizen${index}`, 'Browser test password 2026');
      const { principal } = await sessions.authenticate(token);
      return principal.id;
    }),
  );
  const drafts = new StateDraftService(db);
  const states = new StateService(db);
  const draft = await drafts.create(ownerId, 'Browser pagination fixture');
  const saved = await drafts.save(draft.id, ownerId, {
    version: draft.version,
    title: draft.title,
    step: 1,
    configuration: {
      ...draft.configuration,
      slug: 'e2e-pagination',
      name: { en: 'Pagination fixture', ru: 'Проверка страниц граждан' },
      cofounderIds: citizens,
      governance: applyPreset('AUTOCRACY', ownerId),
    },
  });
  const stateId = await states.submit(draft.id, ownerId, saved.version);
  await states.changeStatus(stateId, ownerId, {
    status: 'ACTIVE',
    reason: 'Disposable browser fixture',
  });
}
export { createPaginationFixture };
