// oxlint-disable import/max-dependencies -- Voting lifecycle composition coordinates snapshots, localized content, validation and completion in one transaction.
// oxlint-disable no-await-in-loop -- Snapshot, option and scheduler writes are serialized on transaction connections.
import { closeCompletedVoting } from './completion';
import { validateSurvey } from './survey-domain';
import { storeSurvey, readSurvey } from './survey-texts';
import {
  galleryImages,
  votingSurveyTexts,
  votings,
  votingQuestions,
  votingOptions,
  votingEligibleVoters,
  adminAuditLog,
} from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import type { Transaction } from '../permissions/transaction';
import { createText, readText } from '../localized-content/service';
import { DomainError, HTTP } from '../errors';
import { frozenVoters } from './electorates';
import { validateVoting } from './domain';
import type { VotingInput, VotingSubject } from './contracts';

type VotingRecord = typeof votings.$inferSelect;
async function lockedVoting(transaction: Transaction, id: string): Promise<VotingRecord> {
  const [context] = await transaction
    .select({ configuration: votings.configuration })
    .from(votings)
    .where(eq(votings.id, id));
  if (context !== undefined && 'companyId' in context.configuration.electorate) {
    // Corporate commands lock authorization and ownership before their voting row; legacy state workflows keep their existing state/row order.
    await transaction.execute(
      sql`select pg_advisory_xact_lock(741022), pg_advisory_xact_lock(741023)`,
    );
  }
  const [record] = await transaction.select().from(votings).where(eq(votings.id, id)).for('update');
  if (!record) {
    throw new DomainError(HTTP.notFound, 'VOTING_NOT_FOUND', 'Голосование не найдено');
  }
  return record;
}
async function advance(
  transaction: Transaction,
  record: Readonly<VotingRecord>,
  now: Date,
): Promise<VotingRecord> {
  if (record.status === 'SCHEDULED' && record.opensAt <= now) {
    const voters = await frozenVoters(transaction, record.configuration.electorate);
    if (voters.length > 0) {
      await transaction.insert(votingEligibleVoters).values(
        voters.map((voter) => ({
          votingId: record.id,
          voterId: voter.voterId,
          userId: voter.userId,
          subjectId: voter.subjectId,
          weight: voter.weight,
        })),
      );
    }
    const status =
      record.configuration.survey?.manualClose !== true && record.closesAt <= now
        ? 'CLOSED'
        : 'OPEN';
    await transaction
      .update(votings)
      .set({ status, snapshotAt: now })
      .where(eq(votings.id, record.id));
    return await closeCompletedVoting(transaction, { ...record, status, snapshotAt: now });
  }
  if (
    record.status === 'OPEN' &&
    record.configuration.survey?.manualClose !== true &&
    record.closesAt <= now
  ) {
    await transaction.update(votings).set({ status: 'CLOSED' }).where(eq(votings.id, record.id));
    return { ...record, status: 'CLOSED' };
  }
  return await closeCompletedVoting(transaction, record);
}
async function hydrateInput(
  transaction: Transaction,
  record: Readonly<VotingRecord>,
): Promise<VotingInput> {
  const options = await transaction
    .select()
    .from(votingOptions)
    .where(eq(votingOptions.votingId, record.id));
  const questionRows =
    record.configuration.questions === undefined
      ? []
      : await transaction
          .select()
          .from(votingQuestions)
          .where(eq(votingQuestions.votingId, record.id));
  const questions =
    record.configuration.questions === undefined
      ? undefined
      : await Promise.all(
          record.configuration.questions.map(async (question) => {
            const row = questionRows.find((candidate) => candidate.questionKey === question.id);
            if (!row) {
              throw new Error('Voting question missing');
            }
            return { ...question, title: await readText(transaction, row.titleTextId) };
          }),
        );
  return {
    ...record.configuration,
    survey: await readSurvey(transaction, record.id, record.configuration.survey),
    questions,
    title: await readText(transaction, record.titleTextId),
    description: await readText(transaction, record.descriptionTextId),
    options: await Promise.all(
      record.configuration.options.map(async (option) => {
        const row = options.find((candidate) => candidate.optionKey === option.id);
        if (!row) {
          throw new Error('Voting option missing');
        }
        return { id: option.id, label: await readText(transaction, row.labelTextId) };
      }),
    ),
  };
}
function strippedVotingInput(input: Readonly<VotingInput>): VotingInput {
  return {
    ...input,
    title: {},
    description: {},
    questions: input.questions?.map((question) => ({ ...question, title: {} })),
    options: input.options.map((option) => ({ ...option, label: {} })),
  };
}
async function persistVotingOptions(
  transaction: Transaction,
  id: string,
  input: Readonly<VotingInput>,
): Promise<void> {
  for (const question of input.questions ?? []) {
    await transaction.insert(votingQuestions).values({
      votingId: id,
      questionKey: question.id,
      titleTextId: await createText(transaction, question.title),
    });
  }
  for (const [position, option] of input.options.entries()) {
    await transaction.insert(votingOptions).values({
      votingId: id,
      optionKey: option.id,
      labelTextId: await createText(transaction, option.label),
      position,
    });
  }
}
async function replaceVotingInput(
  transaction: Transaction,
  id: string,
  input: Readonly<VotingInput>,
): Promise<void> {
  await transaction.delete(votingSurveyTexts).where(eq(votingSurveyTexts.votingId, id));
  const survey = await storeSurvey(transaction, id, input.survey);
  await transaction.delete(votingQuestions).where(eq(votingQuestions.votingId, id));
  await transaction.delete(votingOptions).where(eq(votingOptions.votingId, id));
  await transaction
    .update(votings)
    .set({
      titleTextId: await createText(transaction, input.title),
      descriptionTextId: await createText(transaction, input.description),
      opensAt: new Date(input.opensAt),
      closesAt: new Date(input.closesAt),
      configuration: { ...strippedVotingInput(input), survey },
    })
    .where(eq(votings.id, id));
  await persistVotingOptions(transaction, id, input);
}
async function persistVoting(
  transaction: Transaction,
  actorId: string,
  input: Readonly<VotingInput>,
): Promise<string> {
  validateVoting(input);
  const id = crypto.randomUUID();
  const survey = input.survey === undefined ? undefined : { ...input.survey, blocks: [] };
  await transaction.insert(votings).values({
    id,
    createdBy: actorId,
    titleTextId: await createText(transaction, input.title),
    descriptionTextId: await createText(transaction, input.description),
    opensAt: new Date(input.opensAt),
    closesAt: new Date(input.closesAt),
    configuration: { ...strippedVotingInput(input), survey },
  });
  if (input.survey) {
    const stored = await storeSurvey(transaction, id, input.survey);
    await transaction
      .update(votings)
      .set({ configuration: { ...strippedVotingInput(input), survey: stored } })
      .where(eq(votings.id, id));
  }
  await persistVotingOptions(transaction, id, input);
  await transaction
    .insert(adminAuditLog)
    .values({ actorId, targetId: id, targetType: 'VOTING', action: 'voting.created' });
  return id;
}
type PublicationOptions = Readonly<{
  now?: Date;
  subject?: VotingSubject;
  governanceRevisionId?: string;
  companyRevisionId?: string;
}>;
async function validatePublication(
  transaction: Transaction,
  record: Readonly<VotingRecord>,
  options: PublicationOptions,
): Promise<void> {
  const input = await hydrateInput(transaction, record);
  validateVoting(input);
  validateSurvey(input, true);
  if (
    'companyId' in input.electorate &&
    (options.subject?.type !== 'COMPANY_DECISION' ||
      options.companyRevisionId === undefined ||
      options.governanceRevisionId !== undefined)
  ) {
    throw new DomainError(
      HTTP.conflict,
      'CORPORATE_VOTING_BINDING_REQUIRED',
      'Корпоративное голосование должно быть связано с точным решением и уставом',
    );
  }
  if (
    input.survey &&
    (options.subject ||
      options.governanceRevisionId !== undefined ||
      record.subject ||
      record.governanceRevisionId !== null)
  ) {
    throw new DomainError(
      HTTP.badRequest,
      'SURVEY_GOVERNANCE_FORBIDDEN',
      'Анкета не может принимать государственное решение',
    );
  }
  for (const image of input.survey?.blocks.flatMap((block) => block.images) ?? []) {
    const [stored] = await transaction
      .select({ id: galleryImages.id, deletedAt: galleryImages.deletedAt })
      .from(galleryImages)
      .where(eq(galleryImages.id, image.id));
    if (!stored || stored.deletedAt !== null) {
      throw new DomainError(
        HTTP.badRequest,
        'SURVEY_IMAGE_NOT_FOUND',
        'Изображение не найдено в галерее',
      );
    }
  }
}
async function publishVoting(
  transaction: Transaction,
  id: string,
  options: PublicationOptions = {},
): Promise<void> {
  const record = await lockedVoting(transaction, id);
  const now = options.now ?? new Date();
  if (
    record.status !== 'DRAFT' ||
    (record.configuration.survey?.manualClose !== true && record.closesAt <= now)
  ) {
    throw new DomainError(
      HTTP.conflict,
      'INVALID_VOTING_STATUS',
      'Голосование нельзя опубликовать',
    );
  }
  await validatePublication(transaction, record, options);
  await transaction
    .update(votings)
    .set({
      status: 'SCHEDULED',
      subject: options.subject ?? null,
      governanceRevisionId: options.governanceRevisionId ?? null,
      companyRevisionId: options.companyRevisionId ?? null,
    })
    .where(eq(votings.id, id));
  await advance(
    transaction,
    {
      ...record,
      status: 'SCHEDULED',
      subject: options.subject ?? null,
      governanceRevisionId: options.governanceRevisionId ?? null,
      companyRevisionId: options.companyRevisionId ?? null,
    },
    now,
  );
}
export { lockedVoting, advance, hydrateInput, persistVoting, publishVoting, replaceVotingInput };

export { closeCompletedVoting } from './completion';
