import { DomainError, HTTP } from '../errors';
import { resolveText } from '../localized-content/contracts';
import { compileAuthority } from '../governance/authority';
import type { AuthorityRequirements } from '../governance/authority';
import type { VotingInput } from '../voting/contracts';
import type {
  CompanyAction,
  CompanyCharter,
  CompanyConfiguration,
  CompanyProcedure,
  LegalOwner,
} from './contracts';

type CompanyElectorate = Extract<VotingInput['electorate'], { companyId: string }>;
function ownerKey(owner: LegalOwner): string {
  return `${owner.type}:${owner.id}`;
}
function corporateError(code: string, message: string): never {
  throw new DomainError(HTTP.conflict, code, message);
}
function assertProcedure(procedure: CompanyProcedure, officeIds: ReadonlySet<string>): void {
  const offices = new Set(procedure.officeIds);
  const officeMechanism = [
    'SINGLE_OFFICE',
    'ANY_OF_OFFICES',
    'MULTIPLE_OFFICES',
    'COMBINED',
    'OFFICE_VOTE',
  ].includes(procedure.mechanism);
  if (
    offices.size !== procedure.officeIds.length ||
    procedure.officeIds.some((id) => !officeIds.has(id)) ||
    (officeMechanism && offices.size === 0) ||
    (!officeMechanism && offices.size > 0) ||
    (procedure.mechanism === 'SINGLE_OFFICE' && offices.size !== 1) ||
    (procedure.mechanism === 'MANUAL' && !resolveText(procedure.manualProcedure, 'en').value.trim())
  ) {
    corporateError(
      'COMPANY_PROCEDURE_INVALID',
      'Проверьте корпоративную процедуру и ссылки на должности',
    );
  }
}
function assertCompanyCharter(charter: CompanyCharter, formation = false): void {
  const officeIds = new Set(charter.offices.map((office) => office.id));
  if (
    officeIds.size !== charter.offices.length ||
    new Set(charter.policies.map((policy) => policy.action)).size !== charter.policies.length
  ) {
    corporateError('COMPANY_CHARTER_DUPLICATE', 'Должности и действия не должны повторяться');
  }
  for (const office of charter.offices) {
    if (
      !resolveText(office.name, 'en').value.trim() ||
      new Set(office.initialHolderIds).size !== office.initialHolderIds.length ||
      (formation && office.initialHolderIds.length > office.maxHolders) ||
      (formation && office.required && office.initialHolderIds.length === 0)
    ) {
      corporateError(
        'COMPANY_OFFICE_INVALID',
        'Проверьте название и первоначальные назначения должности',
      );
    }
    assertProcedure(office.appointment, officeIds);
    assertProcedure(office.removal, officeIds);
  }
  for (const policy of charter.policies) {
    assertProcedure(policy.procedure, officeIds);
    const bands = new Set<string>();
    for (const band of policy.financialBands) {
      const key = `${band.currencyId}:${band.upToMinor}`;
      if (policy.action !== 'TRANSFER_FUNDS' || bands.has(key)) {
        corporateError(
          'COMPANY_FINANCIAL_BANDS_INVALID',
          'Финансовые пороги не должны повторяться или изменять другие действия',
        );
      }
      bands.add(key);
      assertProcedure(band.procedure, officeIds);
    }
  }
}
function assertCompanyFormation(configuration: CompanyConfiguration): void {
  if (
    configuration.registrationStateId === null ||
    !resolveText(configuration.name, 'en').value.trim()
  ) {
    corporateError(
      'COMPANY_IDENTITY_REQUIRED',
      'Укажите название и государство регистрации компании',
    );
  }
  const owners = configuration.allocations.map((allocation) => ownerKey(allocation.owner));
  const distributed = configuration.allocations.reduce(
    (sum, allocation) => sum + BigInt(allocation.shares),
    0n,
  );
  if (
    BigInt(configuration.totalShares) <= 0n ||
    distributed !== BigInt(configuration.totalShares) ||
    new Set(owners).size !== owners.length
  ) {
    corporateError(
      'COMPANY_SHARES_UNBALANCED',
      'Акции должны быть распределены точно и без повторных собственников',
    );
  }
  assertCompanyCharter(configuration.charter, true);
}
function companyProcedure(
  charter: CompanyCharter,
  action: CompanyAction,
  payment?: Readonly<{ currencyId: string; amountMinor: string }>,
): CompanyProcedure {
  const policy = charter.policies.find((candidate) => candidate.action === action);
  if (!policy) {
    throw new DomainError(
      HTTP.forbidden,
      'COMPANY_AUTHORITY_MISSING',
      'Корпоративное полномочие не настроено в уставе',
    );
  }
  if (action !== 'TRANSFER_FUNDS') {
    return policy.procedure;
  }
  if (payment === undefined || !/^[1-9][0-9]{0,29}$/u.test(payment.amountMinor)) {
    corporateError(
      'COMPANY_PAYMENT_CONTEXT_REQUIRED',
      'Для финансовой процедуры требуется точная сумма и валюта',
    );
  }
  const amount = BigInt(payment.amountMinor);
  let selected = policy.procedure;
  let lowest: bigint | null = null;
  for (const band of policy.financialBands) {
    const limit = BigInt(band.upToMinor);
    if (
      band.currencyId === payment.currencyId &&
      amount <= limit &&
      (lowest === null || limit < lowest)
    ) {
      selected = band.procedure;
      lowest = limit;
    }
  }
  return selected;
}
function companyRequirements(
  companyId: string,
  charter: CompanyCharter,
  procedure: CompanyProcedure,
): AuthorityRequirements<CompanyElectorate> {
  return compileAuthority(
    {
      ...procedure,
      mechanism: procedure.mechanism === 'SHAREHOLDER_VOTE' ? 'VOTE' : procedure.mechanism,
    },
    {
      electorate: { type: 'COMPANY_SHAREHOLDERS', companyId },
      officeElectorate: {
        type: 'COMPANY_OFFICE_HOLDERS',
        companyId,
        officeIds: procedure.officeIds,
      },
      defaults: charter.votingDefaults,
    },
  );
}
export {
  ownerKey,
  corporateError,
  assertProcedure,
  assertCompanyCharter,
  assertCompanyFormation,
  companyProcedure,
  companyRequirements,
  type CompanyElectorate,
};
