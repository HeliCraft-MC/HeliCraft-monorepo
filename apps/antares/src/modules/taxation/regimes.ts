import { monetaryError } from '../monetary/domain';
import type { TaxRule, TaxEvent } from './contracts';
import type { FinancialTransfer } from './participants';

interface RegimeCandidate {
  readonly id: string;
  readonly stateId: string;
  readonly rule: TaxRule;
}
interface AppliedNationalRule<Candidate> {
  readonly base: Candidate;
  readonly applied: Candidate;
}
function ruleAppliesToTransfer(rule: TaxRule, input: FinancialTransfer): boolean {
  const payer = rule.taxpayer === 'RECIPIENT' ? input.recipient : input.sender;
  const { regime } = rule;
  return (
    regime === undefined ||
    (payer.kind === 'COMPANY' &&
      regime.companyId === payer.id &&
      (regime.branchId === null ||
        (rule.taxpayer === 'SENDER' && regime.branchId === input.sourceBranchId)))
  );
}
function ruleAppliesToEvent(rule: TaxRule, event: TaxEvent): boolean {
  return (rule.events ?? [rule.event]).includes(event);
}
function applyCompanyRegimes<Candidate extends RegimeCandidate>(
  candidates: readonly Candidate[],
): AppliedNationalRule<Candidate>[] {
  return candidates
    .filter(
      (candidate) =>
        candidate.rule.regime === undefined || candidate.rule.regime.mode === 'ADDITIONAL',
    )
    .map((base) => {
      const replacements = candidates.filter(
        (candidate) =>
          candidate.rule.regime?.targetLawId === base.id &&
          candidate.stateId === base.stateId &&
          candidate.rule.taxpayer === base.rule.taxpayer,
      );
      if (replacements.length > 1) {
        monetaryError(
          'COMPANY_TAX_REGIME_CONFLICT',
          'Одновременно действуют несовместимые специальные правила для одного национального требования',
        );
      }
      return { base, applied: replacements[0] ?? base };
    });
}
export { ruleAppliesToTransfer, ruleAppliesToEvent, applyCompanyRegimes, type AppliedNationalRule };
