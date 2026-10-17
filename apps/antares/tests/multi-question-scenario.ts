// oxlint-disable no-magic-numbers, unicorn/no-await-expression-member -- Scenario fixture counts and response assertions exercise real persisted behavior.
import { expect } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Database } from '../src/db';
import { votings, votingQuestions } from '../src/db/schema';
import type { VotingInput } from '../src/modules/voting/contracts';
import { VotingService } from '../src/modules/voting/service';

// oxlint-disable-next-line max-lines-per-function, max-statements -- Poll text persistence, ballot rollback and participant totals share one real database fixture.
async function assertMultiQuestionPoll(
  db: Database['db'],
  inputContext: Readonly<{ adminId: string; voterId: string; base: VotingInput }>,
): Promise<void> {
  const { adminId, voterId, base } = inputContext;
  const service = new VotingService(db);
  const options = ['Yes', 'No', 'North', 'South'].map((label) => ({
    id: crypto.randomUUID(),
    label: { en: label },
  }));
  const input: VotingInput = {
    ...base,
    electorate: { type: 'GLOBAL_USERS' },
    options,
    questions: [
      {
        id: crypto.randomUUID(),
        title: { en: 'Build?', ru: 'Строим?' },
        optionIds: options.slice(0, 2).map((option) => option.id),
        maxSelections: 1,
      },
      {
        id: crypto.randomUUID(),
        title: { en: 'Where?' },
        optionIds: options.slice(2).map((option) => option.id),
        maxSelections: 1,
      },
    ],
  };
  const id = await service.create(adminId, input);
  const detail = await service.detail(id, adminId, true);
  expect(detail.input.questions).toStrictEqual(input.questions);
  const [record] = await db.select().from(votings).where(eq(votings.id, id));
  expect(record?.configuration.questions?.map((question) => question.title)).toStrictEqual([
    {},
    {},
  ]);
  expect(
    await db.select().from(votingQuestions).where(eq(votingQuestions.votingId, id)),
  ).toHaveLength(2);
  await expect(service.update(id, voterId, input)).rejects.toThrow();
  const updated = {
    ...input,
    description: { en: 'Edited draft' },
    questions:
      input.questions === undefined
        ? undefined
        : [...input.questions.slice(1), ...input.questions.slice(0, 1)],
  };
  await service.update(id, adminId, updated);
  expect((await service.detail(id, adminId, true)).input.questions).toStrictEqual(
    updated.questions,
  );
  await service.publish(id, adminId);
  await expect(service.update(id, adminId, input)).rejects.toThrow('неопубликованный');
  const choices = [options[0]?.id, options[2]?.id].flatMap((key) =>
    key === undefined ? [] : [key],
  );
  await expect(
    service.cast(id, voterId, { choices: choices.slice(0, 1), abstain: false }),
  ).rejects.toThrow('Некорректный');
  await service.cast(id, voterId, { choices, abstain: false });
  await expect(service.cast(id, voterId, { choices, abstain: false })).rejects.toThrow(
    'уже принят',
  );
  expect((await service.detail(id, voterId, false)).result?.participating).toBe(1);
}
export { assertMultiQuestionPoll };
