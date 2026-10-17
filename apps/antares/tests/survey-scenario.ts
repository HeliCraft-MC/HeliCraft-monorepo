// oxlint-disable no-magic-numbers, unicorn/no-await-expression-member -- Scenario fixture counts assert transactional persistence and response visibility.
import { expect } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Database } from '../src/db';
import { votings, votingSurveyTexts, votingBallots } from '../src/db/schema';
import type { VotingInput } from '../src/modules/voting/contracts';
import { VotingService } from '../src/modules/voting/service';
import { SurveyService } from '../src/modules/voting/survey-service';
import { surveyInput } from './survey-fixture';

// oxlint-disable-next-line max-lines-per-function, max-statements -- One real PostgreSQL scenario verifies locking, snapshots, reopening and the unchanged governance path together.
async function assertHybridSurvey(
  db: Database['db'],
  context: Readonly<{ adminId: string; voterId: string; base: VotingInput }>,
): Promise<void> {
  const { adminId, voterId, base } = context;
  const voting = new VotingService(db);
  const surveys = new SurveyService(db);
  const input = surveyInput(base);
  const [text, choice] = input.survey?.blocks ?? [];
  if (!text || !choice) {
    throw new Error('Missing fixture');
  }
  const answers = [
    { questionId: text.id, value: 'Build a port' },
    { questionId: choice.id, value: choice.optionIds },
  ];
  const id = await voting.create(adminId, input);
  expect((await voting.detail(id, adminId, true)).input.survey).toStrictEqual(input.survey);
  const [row] = await db.select().from(votings).where(eq(votings.id, id));
  expect(row?.configuration.survey?.blocks[0]?.title).toStrictEqual({});
  expect(
    await db.select().from(votingSurveyTexts).where(eq(votingSurveyTexts.votingId, id)),
  ).toHaveLength(12);
  await expect(voting.detail(id, voterId, false)).rejects.toThrow('не найдено');
  await expect(surveys.responses(id, voterId, { page: 1, pageSize: 20 })).rejects.toThrow();
  await voting.publish(id, adminId);
  await expect(voting.update(id, adminId, input)).rejects.toThrow('неопубликованный');
  await expect(
    voting.cast(id, voterId, { choices: [], abstain: false, answers: answers.slice(0, 1) }),
  ).rejects.toThrow('Проверьте');
  expect(await db.select().from(votingBallots).where(eq(votingBallots.votingId, id))).toHaveLength(
    0,
  );
  const attempts = await Promise.allSettled([
    voting.cast(id, voterId, { choices: [], abstain: false, answers }),
    voting.cast(id, voterId, { choices: [], abstain: false, answers }),
  ]);
  expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  const responses = await surveys.responses(id, adminId, { page: 1, pageSize: 1 });
  expect(responses.total).toBe(1);
  expect(responses.items[0]?.answers).toStrictEqual(answers);
  const detail = await voting.detail(id, voterId, false);
  expect(detail.result?.survey?.[1]?.options.map((option) => option.count)).toStrictEqual([1, 1]);
  expect(detail).not.toHaveProperty('answers');
  await surveys.action(id, adminId, { action: 'close' });
  await expect(voting.cast(id, adminId, { choices: [], abstain: false, answers })).rejects.toThrow(
    'закрыто',
  );
  await surveys.action(id, adminId, {
    action: 'reopen',
    closesAt: new Date(Date.now() + 3_600_000).toISOString(),
  });
  await expect(voting.cast(id, voterId, { choices: [], abstain: false, answers })).rejects.toThrow(
    'уже принят',
  );
  const [response] = responses.items;
  if (!response) {
    throw new Error('Missing response');
  }
  await surveys.removeResponse(id, response.id, adminId);
  await voting.cast(id, voterId, { choices: [], abstain: false, answers });
  await surveys.action(id, adminId, { action: 'archive' });
  expect(await voting.list(voterId, false)).not.toContain(id);
  await expect(voting.detail(id, voterId, false)).rejects.toThrow('не найдено');
  expect((await surveys.responses(id, adminId, { page: 1, pageSize: 20 })).total).toBe(1);
  if (!input.survey) {
    throw new Error('Missing survey');
  }
  const repeatId = await voting.create(adminId, {
    ...input,
    survey: { ...input.survey, oneResponsePerUser: false },
  });
  await voting.publish(repeatId, adminId);
  await Promise.all([
    voting.cast(repeatId, voterId, { choices: [], abstain: false, answers }),
    voting.cast(repeatId, voterId, { choices: [], abstain: false, answers }),
  ]);
  expect((await surveys.responses(repeatId, adminId, { page: 1, pageSize: 20 })).total).toBe(2);
  const manualId = await voting.create(adminId, {
    ...input,
    opensAt: new Date(Date.now() - 7_200_000).toISOString(),
    closesAt: new Date(Date.now() - 3_600_000).toISOString(),
    survey: { ...input.survey, manualClose: true },
  });
  await voting.publish(manualId, adminId);
  expect((await voting.detail(manualId, voterId, false)).status).toBe('OPEN');
  await surveys.action(manualId, adminId, { action: 'close' });
  await surveys.action(manualId, adminId, { action: 'reopen' });
  expect((await voting.detail(manualId, voterId, false)).status).toBe('OPEN');
  const standardId = await voting.create(adminId, base);
  await expect(surveys.action(standardId, adminId, { action: 'archive' })).rejects.toThrow('анкет');
}
export { assertHybridSurvey };
