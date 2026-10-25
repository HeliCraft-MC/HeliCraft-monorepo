// oxlint-disable import/max-dependencies -- Recipient tasks reuse current issuer, consumption and Governance proof readers before disclosing an offer.
import { asc, eq, gt } from 'drizzle-orm';
import { companyShareOperations, companyShareEvents } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { shareRecipients } from './share-domain';
import { mayActForEntity } from './inbox-authority';
import { operationAvailable, shareConsentViews } from './share-consent-read';
import { readCompanyRevision } from './revisions';
import { sharesTaskHref } from './inbox-links';
import { INBOX_SCAN_SIZE, inboxPage } from './inbox-page';
import type { LegalOwner } from './contracts';
import type { CompanyInboxItem, CompanyInboxPage } from './inbox-contracts';

type OperationRecord = typeof companyShareOperations.$inferSelect;
async function shareTask(
  transaction: Transaction,
  input: Readonly<{ row: OperationRecord; owner: LegalOwner; actorId: string }>,
): Promise<CompanyInboxItem | null> {
  const { row, owner, actorId } = input;
  if (
    !(await mayActForEntity(transaction, { owner, actorId, action: 'ACCEPT_SHARE_ACQUISITION' }))
  ) {
    return null;
  }
  const [event] = await transaction
    .select({ id: companyShareEvents.id })
    .from(companyShareEvents)
    .where(eq(companyShareEvents.operationId, row.id));
  if (event !== undefined || !(await operationAvailable(transaction, row.terms, false))) {
    return null;
  }
  const consents = await shareConsentViews(transaction, row.terms, false);
  if (
    consents.some(
      (item) =>
        item.owner.id === owner.id && item.owner.type === owner.type && item.status === 'AVAILABLE',
    )
  ) {
    return null;
  }
  const { content } = await readCompanyRevision(transaction, row.issuerRevisionId);
  return {
    id: `${row.id}:${owner.id}`,
    title: content.name,
    action: 'SHARE_CONSENT',
    href: sharesTaskHref(owner, row.id),
  };
}
async function sharesInbox(
  transaction: Transaction,
  actorId: string,
  after?: string,
): Promise<CompanyInboxPage> {
  const rows = await transaction
    .select()
    .from(companyShareOperations)
    .where(after === undefined ? undefined : gt(companyShareOperations.id, after))
    .orderBy(asc(companyShareOperations.id))
    .limit(INBOX_SCAN_SIZE);
  const items: CompanyInboxItem[] = [];
  for (const row of rows) {
    for (const { owner } of shareRecipients(row.terms)) {
      // oxlint-disable-next-line no-await-in-loop -- The recipient's current proof, consumption and authority are checked on one transaction connection.
      const task = await shareTask(transaction, { row, owner, actorId });
      if (task !== null) {
        items.push(task);
      }
    }
  }
  return inboxPage(rows, items);
}
export { sharesInbox };
