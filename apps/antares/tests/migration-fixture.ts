import { copyFile, mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { z } from '@hono/zod-openapi';

const JournalSchema = z.object({
  version: z.string(),
  dialect: z.string(),
  entries: z.array(
    z.object({
      idx: z.number(),
      version: z.string(),
      when: z.number(),
      tag: z.string(),
      breakpoints: z.boolean(),
    }),
  ),
});
async function migrationsBefore(index: number): Promise<string> {
  const folder = await mkdtemp('/tmp/helicraft-upgrade-');
  const journal = JournalSchema.parse(await Bun.file('./drizzle/meta/_journal.json').json());
  const entries = journal.entries.filter((entry) => entry.idx < index);
  await mkdir(path.join(folder, 'meta'));
  await Promise.all(
    entries.map(async (entry) => {
      await copyFile(
        path.join('drizzle', `${entry.tag}.sql`),
        path.join(folder, `${entry.tag}.sql`),
      );
    }),
  );
  await Bun.write(
    path.join(folder, 'meta', '_journal.json'),
    JSON.stringify({ ...journal, entries }),
  );
  return folder;
}
export { migrationsBefore };
