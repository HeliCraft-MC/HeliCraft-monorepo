import { constitutionLimitIssues } from './constitution-limits';
import type { Governance, Issue, Office, Policy, StateConfiguration } from './contracts';
import { resolveText } from '../localized-content/contracts';

const REQUIRED_ACTIONS = [
  'AMEND_GOVERNANCE',
  'ENACT_LAW',
  'REPEAL_LAW',
  'ACCEPT_CITIZEN',
  'REMOVE_CITIZEN',
  'APPOINT_OFFICE_HOLDER',
  'REMOVE_OFFICE_HOLDER',
] as const;
function error(path: string, message: string): Issue {
  return { severity: 'ERROR', path, message };
}
function validateOffice(
  office: Readonly<Office>,
  context: Readonly<{ officeIds: ReadonlySet<string>; founders: readonly string[] }>,
): Issue[] {
  const issues: Issue[] = [];
  const path = `governance.offices.${office.id}`;
  if (!resolveText(office.name, 'en').value) {
    issues.push(error(`${path}.name`, 'Укажите название должности'));
  }
  if (
    office.initialHolderIds.length > office.maxHolders ||
    new Set(office.initialHolderIds).size !== office.initialHolderIds.length
  ) {
    issues.push(error(`${path}.initialHolderIds`, 'Некорректный состав должностных лиц'));
  }
  if (office.initialHolderIds.some((id) => !context.founders.includes(id))) {
    issues.push(
      error(`${path}.initialHolderIds`, 'Назначаемые игроки должны входить в разрешённый состав'),
    );
  }
  const needsAuthority =
    office.appointment === 'APPOINTED_BY_OFFICE' || office.appointment === 'COUNCIL_VOTE';
  if (
    needsAuthority &&
    (office.appointingOfficeId === null || !context.officeIds.has(office.appointingOfficeId))
  ) {
    issues.push(error(`${path}.appointingOfficeId`, 'Выберите существующую назначающую должность'));
  }
  if (office.term === 'FIXED_TERM' && office.termDays === null) {
    issues.push(error(`${path}.termDays`, 'Укажите продолжительность срока'));
  }
  if (office.required && office.initialHolderIds.length === 0) {
    issues.push({ severity: 'WARNING', path, message: 'Обязательная должность пока вакантна' });
  }
  return issues;
}
function validatePolicy(policy: Readonly<Policy>, officeIds: ReadonlySet<string>): Issue[] {
  const issues: Issue[] = [];
  const path = `governance.policies.${policy.action}`;
  if (
    policy.officeIds.some((id) => !officeIds.has(id)) ||
    new Set(policy.officeIds).size !== policy.officeIds.length
  ) {
    issues.push(error(path, 'Процедура ссылается на неизвестную или повторённую должность'));
  }
  const needsOffice = [
    'SINGLE_OFFICE',
    'ANY_OF_OFFICES',
    'MULTIPLE_OFFICES',
    'COUNCIL_VOTE',
    'COMBINED',
  ].includes(policy.mechanism);
  if (needsOffice && policy.officeIds.length === 0) {
    issues.push(error(path, 'Выберите должности'));
  }
  if (policy.mechanism === 'SINGLE_OFFICE' && policy.officeIds.length !== 1) {
    issues.push(error(path, 'Выберите одну должность'));
  }
  if (policy.mechanism === 'MANUAL' && !resolveText(policy.manualProcedure, 'en').value) {
    issues.push(error(path, 'Опишите ручную процедуру'));
  }
  return issues;
}
function validateGovernance(
  governance: Readonly<Governance>,
  founders: readonly string[],
): Issue[] {
  const officeIds = new Set(governance.offices.map((office) => office.id));
  const actions = new Set(governance.policies.map((policy) => policy.action));
  const issues = governance.offices.flatMap((office) =>
    validateOffice(office, { officeIds, founders }),
  );
  issues.push(...governance.policies.flatMap((policy) => validatePolicy(policy, officeIds)));
  if (officeIds.size !== governance.offices.length) {
    issues.push(error('governance.offices', 'Должности должны иметь уникальные идентификаторы'));
  }
  if (actions.size !== governance.policies.length) {
    issues.push(error('governance.policies', 'Каждое действие должно иметь одну процедуру'));
  }
  for (const action of REQUIRED_ACTIONS) {
    if (!actions.has(action)) {
      issues.push(error(`governance.policies.${action}`, 'Настройте процедуру принятия решения'));
    }
  }
  return issues;
}
function validateConstitution(configuration: Readonly<StateConfiguration>): Issue[] {
  const document = configuration.constitution;
  if (document === null) {
    return [];
  }
  const issues: Issue[] = [];
  if (!resolveText(document.title, 'en').value) {
    issues.push(error('constitution.title', 'Укажите название документа'));
  }
  if (new Set(document.blocks.map((block) => block.id)).size !== document.blocks.length) {
    issues.push(error('constitution.blocks', 'Идентификаторы блоков должны быть уникальны'));
  }
  for (const block of document.blocks.filter((item) => item.type === 'GENERATED')) {
    if (
      ['SINGLE_OFFICE', 'OFFICE_APPOINTMENT_RULE'].includes(block.kind) &&
      !configuration.governance.offices.some((office) => office.id === block.officeId)
    ) {
      issues.push(
        error(`constitution.blocks.${block.id}`, 'Выберите существующую должность для блока'),
      );
    }
    if (
      block.kind === 'STATE_DECISION_RULE' &&
      !configuration.governance.policies.some((policy) => policy.action === block.action)
    ) {
      issues.push(
        error(`constitution.blocks.${block.id}`, 'Выберите существующую процедуру для блока'),
      );
    }
  }
  issues.push(...constitutionLimitIssues(configuration));
  return issues;
}
export { REQUIRED_ACTIONS, validateGovernance, validateConstitution, error };
