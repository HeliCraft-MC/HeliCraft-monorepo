// oxlint-disable no-magic-numbers, unicorn/no-await-expression-member -- Scenario fixture counts and response assertions exercise real persisted behavior.
import { expect } from 'vitest';
import type { Database } from '../src/db';
import type { createApp } from '../src/app';
import { userRoles } from '../src/db/schema';
import { StateDraftService } from '../src/modules/states/drafts';
import { StateService } from '../src/modules/states/service';
import { applyPreset } from '../src/modules/states/presets';
import { GalleryItemSchema } from '../src/modules/gallery/contracts';
import type { GalleryItem } from '../src/modules/gallery/contracts';

// oxlint-disable-next-line max-lines-per-function, max-statements -- Real photo metadata authorization and active-state visibility share one fixture lifecycle.
async function assertGalleryStates(
  db: Database['db'],
  app: ReturnType<typeof createApp>,
  input: Readonly<{ item: GalleryItem; headers: Record<string, string> }>,
): Promise<void> {
  const { item, headers } = input;
  await db.insert(userRoles).values({ userId: item.author.id, role: 'ADMIN' });
  const drafts = new StateDraftService(db);
  const states = new StateService(db);
  const draft = await drafts.create(item.author.id, 'Gallery state');
  const saved = await drafts.save(draft.id, item.author.id, {
    version: draft.version,
    title: draft.title,
    step: 1,
    configuration: {
      ...draft.configuration,
      slug: 'gallery-state',
      name: { ru: 'Государство на снимке', en: 'Photo state' },
      governance: applyPreset('AUTOCRACY', item.author.id),
    },
  });
  const stateId = await states.submit(draft.id, item.author.id, saved.version);
  const path = `/api/v1/account/gallery/${item.id}`;
  const body = {
    title: item.title,
    alt: item.alt,
    players: item.players.map((player) => player.id),
    stateLinks: [{ stateId, role: 'LOCATION' }],
  };
  const requestHeaders = { ...headers, 'Content-Type': 'application/json' };
  expect(
    (
      await app.request(path, {
        method: 'PATCH',
        headers: requestHeaders,
        body: JSON.stringify(body),
      })
    ).status,
  ).toBe(400);
  await states.changeStatus(stateId, item.author.id, {
    status: 'ACTIVE',
    reason: 'Gallery fixture',
  });
  const accepted = await app.request(path, {
    method: 'PATCH',
    headers: requestHeaders,
    body: JSON.stringify(body),
  });
  expect(accepted.status).toBe(200);
  const linked = GalleryItemSchema.parse(await accepted.json());
  expect(linked.states).toStrictEqual([
    {
      id: stateId,
      slug: 'gallery-state',
      name: { ru: 'Государство на снимке', en: 'Photo state' },
      color: saved.configuration.color,
      role: 'LOCATION',
    },
  ]);
  expect(
    (
      await app.request(path, {
        method: 'PATCH',
        headers: requestHeaders,
        body: JSON.stringify({ ...body, stateLinks: [...body.stateLinks, ...body.stateLinks] }),
      })
    ).status,
  ).toBe(400);
  await states.changeStatus(stateId, item.author.id, {
    status: 'SUSPENDED',
    reason: 'Check public visibility',
  });
  const hidden = GalleryItemSchema.parse(
    await (await app.request(`/api/v1/public/gallery/${item.id}`)).json(),
  );
  expect(hidden.states).toStrictEqual([]);
  await states.changeStatus(stateId, item.author.id, {
    status: 'ACTIVE',
    reason: 'Restore public visibility',
  });
  const restored = GalleryItemSchema.parse(
    await (await app.request(`/api/v1/public/gallery/${item.id}`)).json(),
  );
  expect(restored.states).toHaveLength(1);
}
export { assertGalleryStates };
