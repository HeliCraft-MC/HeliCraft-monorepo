import { desc, eq } from 'drizzle-orm';
import { companies, companyBranches, taxLaws, taxLawRevisions } from '../../db/schema';
import type { Transaction } from '../permissions/transaction';
import { monetaryError } from '../monetary/domain';
import type { TaxRule } from './contracts';
import { registeredTaxCategory } from './category-registry';

interface RuleIdentityCheck {
  readonly stateId: string;
  readonly lawId: string;
  readonly rule: TaxRule;
  readonly previous: typeof taxLawRevisions.$inferSelect | null;
}
async function assertRegimeBranch(
  transaction: Transaction,
  input: RuleIdentityCheck,
): Promise<void> {
  const { rule } = input;
  const { regime } = rule;
  if (regime === undefined || regime.branchId === null) {
    return;
  }
  const [branch] = await transaction
    .select()
    .from(companyBranches)
    .where(eq(companyBranches.id, regime.branchId));
  if (
    !branch ||
    branch.companyId !== regime.companyId ||
    branch.stateId !== input.stateId ||
    branch.status !== 'ACTIVE' ||
    rule.taxpayer !== 'SENDER' ||
    !rule.jurisdictions.includes('BRANCH_REGISTRATION')
  ) {
    monetaryError(
      'COMPANY_TAX_BRANCH_INVALID',
      'Правило филиала требует его действительную регистрацию в этом государстве и подтверждённый контекст исходящего корпоративного платежа',
    );
  }
}
async function assertRegimeBase(transaction: Transaction, input: RuleIdentityCheck): Promise<void> {
  const { rule } = input;
  const { regime } = rule;
  if (regime === undefined || regime.targetLawId === null) {
    return;
  }
  const [base] = await transaction
    .select({ stateId: taxLaws.stateId, revision: taxLawRevisions })
    .from(taxLaws)
    .innerJoin(taxLawRevisions, eq(taxLawRevisions.lawId, taxLaws.id))
    .where(eq(taxLaws.id, regime.targetLawId))
    .orderBy(desc(taxLawRevisions.number))
    .limit(1);
  if (
    !base ||
    base.stateId !== input.stateId ||
    base.revision.status !== 'ACTIVE' ||
    base.revision.rule.regime !== undefined ||
    regime.targetLawId === input.lawId ||
    base.revision.rule.taxpayer !== rule.taxpayer ||
    base.revision.rule.category !== rule.category
  ) {
    monetaryError(
      'COMPANY_TAX_BASE_INVALID',
      'Замена или освобождение могут изменять только собственное общее требование государства с тем же плательщиком и категорией',
    );
  }
}
async function assertTaxRuleIdentity(
  transaction: Transaction,
  input: RuleIdentityCheck,
): Promise<void> {
  const { rule, previous } = input;
  if (!registeredTaxCategory(rule.category) && previous?.rule.category !== rule.category) {
    monetaryError(
      'TAX_CATEGORY_UNKNOWN',
      'Выберите стабильную категорию из общего налогового реестра',
    );
  }
  const { regime } = rule;
  if (regime === undefined) {
    return;
  }
  const [company] = await transaction
    .select()
    .from(companies)
    .where(eq(companies.id, regime.companyId));
  if (
    !company ||
    company.foundedAt === null ||
    !rule.jurisdictions.some(
      (basis) => basis === 'COMPANY_REGISTRATION' || basis === 'BRANCH_REGISTRATION',
    )
  ) {
    monetaryError(
      'COMPANY_TAX_SUBJECT_INVALID',
      'Специальному правилу требуется учреждённая компания и подтверждённое корпоративное основание',
    );
  }
  if (regime.mode === 'EXEMPT' && rule.rateBps !== 0) {
    monetaryError(
      'COMPANY_TAX_EXEMPT_RATE',
      'Освобождение должно явно устанавливать нулевую ставку',
    );
  }
  await assertRegimeBranch(transaction, input);
  await assertRegimeBase(transaction, input);
}
export { assertTaxRuleIdentity };
