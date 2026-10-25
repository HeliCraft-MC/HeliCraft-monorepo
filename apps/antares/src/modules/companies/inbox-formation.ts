// oxlint-disable import/max-dependencies -- Formation tasks combine exact consent evidence with existing participant authority and shared task links.
import { and, asc, eq, gt, inArray, isNull } from 'drizzle-orm';
import { companyDrafts, companies } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { liveFormationConsents } from './consents';
import { currentConsent } from './formation-context';
import { formationHash } from './draft-configuration';
import { mayActForEntity } from './inbox-authority';
import { formationTaskHref } from './inbox-links';
import { INBOX_SCAN_SIZE, inboxPage } from './inbox-page';
import type { CompanyInboxItem, CompanyInboxPage } from './inbox-contracts';
import type { LegalOwner } from './contracts';
import type { DraftRecord } from './drafts';

type Consents = Awaited<ReturnType<typeof liveFormationConsents>>;
async function founderTask(
  transaction: Transaction,
  input: Readonly<{ actorId: string; owner: LegalOwner; draft: DraftRecord; consents: Consents }>,
): Promise<CompanyInboxItem | null> {
  const { owner, actorId, draft, consents } = input;
  if (!(await mayActForEntity(transaction, { owner, actorId, action: 'FOUND_COMPANY' }))) {
    return null;
  }
  for (const consent of consents.filter(
    (item) => item.role === 'FOUNDER' && item.subjectId === owner.id,
  )) {
    // oxlint-disable-next-line no-await-in-loop -- Entity consent must still satisfy its pinned Governance proof.
    if (await currentConsent(transaction, consent, owner)) {
      return null;
    }
  }
  return {
    id: `${draft.id}:founder:${owner.id}`,
    title: draft.configuration.name,
    href: formationTaskHref(owner, draft.id),
    action: 'FOUNDER_CONSENT',
  };
}
async function formationCandidates(
  transaction: Transaction,
  after?: string,
): Promise<{ draft: DraftRecord }[]> {
  const rows = await transaction
    .select({ draft: companyDrafts })
    .from(companyDrafts)
    .innerJoin(companies, eq(companies.id, companyDrafts.companyId))
    .where(
      and(
        isNull(companyDrafts.deletedAt),
        isNull(companyDrafts.submittedApplicationId),
        inArray(companies.status, ['DRAFT', 'REJECTED']),
        after === undefined ? undefined : gt(companyDrafts.id, after),
      ),
    )
    .orderBy(asc(companyDrafts.id))
    .limit(INBOX_SCAN_SIZE);
  return rows;
}
async function formationInbox(
  transaction: Transaction,
  actorId: string,
  after?: string,
): Promise<CompanyInboxPage> {
  const rows = await formationCandidates(transaction, after);
  const items: CompanyInboxItem[] = [];
  for (const { draft } of rows) {
    const hash = formationHash(draft.companyId, draft.configuration);
    // oxlint-disable-next-line no-await-in-loop -- Consent and authority checks share the same protected snapshot for each candidate.
    const consents = await liveFormationConsents(transaction, draft.companyId, hash);
    for (const { owner } of draft.configuration.allocations) {
      // oxlint-disable-next-line no-await-in-loop -- Only actual participants or authorized representatives receive tasks.
      const task = await founderTask(transaction, { owner, actorId, draft, consents });
      if (task !== null) {
        items.push(task);
      }
    }
    const officer = draft.configuration.charter.offices.some((office) =>
      office.initialHolderIds.includes(actorId),
    );
    if (
      officer &&
      !consents.some(
        (item) =>
          item.role === 'OFFICE_HOLDER' &&
          item.actorId === actorId &&
          item.subjectId === actorId &&
          item.companyDecisionId === null &&
          item.stateDirectiveId === null,
      )
    ) {
      items.push({
        id: `${draft.id}:officer`,
        title: draft.configuration.name,
        href: `/app/companies/drafts/${draft.id}`,
        action: 'OFFICE_CONSENT',
      });
    }
  }
  return inboxPage(
    rows.map(({ draft }) => ({ id: draft.id })),
    items,
  );
}
export { formationInbox };
