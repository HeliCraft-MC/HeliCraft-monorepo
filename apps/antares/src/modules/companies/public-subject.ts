import { eq } from 'drizzle-orm';
import { companies, companyRevisionTexts, states, users } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { readText } from '../localized-content/service';
import { readRevision } from '../states/revisions';
import type { LegalOwner } from './contracts';
import type { PublicLegalIdentity } from './profile-contracts';

async function publicLegalIdentity(
  transaction: Transaction,
  owner: LegalOwner,
): Promise<PublicLegalIdentity> {
  if (owner.type === 'PLAYER') {
    const [player] = await transaction
      .select({ name: users.username })
      .from(users)
      .where(eq(users.id, owner.id));
    return {
      owner,
      name: player ? { en: player.name } : {},
      href: player ? `/players/${owner.id}` : null,
    };
  }
  if (owner.type === 'STATE') {
    const [state] = await transaction.select().from(states).where(eq(states.id, owner.id));
    const revision =
      state?.currentRevisionId !== null && state?.currentRevisionId !== undefined
        ? await readRevision(transaction, state.currentRevisionId)
        : null;
    return {
      owner,
      name: revision?.configuration.name ?? {},
      href: revision ? `/states/${revision.configuration.slug}` : null,
    };
  }
  const [company] = await transaction.select().from(companies).where(eq(companies.id, owner.id));
  if (
    company?.currentRevisionId === null ||
    company?.currentRevisionId === undefined ||
    company.foundedAt === null
  ) {
    return { owner, name: {}, href: null };
  }
  const references = await transaction
    .select()
    .from(companyRevisionTexts)
    .where(eq(companyRevisionTexts.revisionId, company.currentRevisionId));
  const name = references.find((reference) => reference.path === 'name');
  return {
    owner,
    name: name ? await readText(transaction, name.textId) : {},
    href: `/companies/${company.id}`,
  };
}
export { publicLegalIdentity };
