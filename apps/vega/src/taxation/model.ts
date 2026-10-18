import { decisionPolicy } from '../states/decision-policy';
import type { Locale } from '../locales';
import { uiText } from '../states/text';
import type { StateDetail, MonetaryDirectivePayload, GovernancePolicy } from '@helicraft/alhena';

const economicActions = {
  ESTABLISH_TAX_OFFICE: 'ESTABLISH_TAX_OFFICE',
  CHANGE_TAX_CHARTER: 'CHANGE_TAX_OFFICE_CHARTER',
  ENACT_TAX_LAW: 'ENACT_LAW',
  AMEND_TAX_LAW: 'AMEND_TAX_LAW',
  REPEAL_TAX_LAW: 'REPEAL_LAW',
  RATIFY_TREATY: 'SIGN_TREATY',
  AMEND_TREATY: 'AMEND_TREATY',
  REJECT_TREATY: 'SIGN_TREATY',
  DENOUNCE_TREATY: 'DENOUNCE_TREATY',
} satisfies Partial<Record<MonetaryDirectivePayload['kind'], GovernancePolicy['action']>>;
function economicAuthority(
  state: StateDetail,
  actorId: string,
  kind: keyof typeof economicActions,
): boolean {
  const policy = decisionPolicy(state.configuration.governance.policies, economicActions[kind]);
  return (
    state.status === 'ACTIVE' &&
    state.citizens.some((person) => person.id === actorId) &&
    policy !== undefined &&
    (['CITIZEN_VOTE', 'MANUAL'].includes(policy.mechanism) ||
      state.holders.some(
        (holder) => holder.userId === actorId && policy.officeIds.includes(holder.officeId),
      ))
  );
}
const economicLabels: Readonly<Record<string, readonly [string, string]>> = {
  ESTABLISH_TAX_OFFICE: ['Учредить налоговую службу', 'Establish tax office'],
  CHANGE_TAX_CHARTER: ['Изменить устав налоговой службы', 'Change tax charter'],
  ENACT_TAX_LAW: ['Принять налоговый закон', 'Enact tax law'],
  AMEND_TAX_LAW: ['Изменить налоговый закон', 'Amend tax law'],
  REPEAL_TAX_LAW: ['Отменить налоговый закон', 'Repeal tax law'],
  RATIFY_TREATY: ['Утвердить договор своей стороной', 'Ratify for your state'],
  AMEND_TREATY: ['Утвердить новую редакцию договора', 'Ratify treaty amendment'],
  DENOUNCE_TREATY: ['Согласовать прекращение договора', 'Approve treaty termination'],
  REJECT_TREATY: ['Отклонить предложенный договор', 'Reject proposed treaty'],
};

const statusLabels: Readonly<Record<string, readonly [string, string]>> = {
  DRAFT: ['Черновик', 'Draft'],
  PROPOSED: ['Ожидает ратификации', 'Awaiting ratification'],
  PENDING: ['Ожидает одобрения', 'Awaiting review'],
  ACTIVE: ['Действует', 'Active'],
  REJECTED: ['Отклонено', 'Rejected'],
  SUSPENDED: ['Приостановлено', 'Suspended'],
  REPEALED: ['Отменён', 'Repealed'],
  EXPIRED: ['Срок истёк', 'Expired'],
  TERMINATED: ['Прекращён', 'Terminated'],
};
function economicStatus(locale: Locale, status: string): string {
  const label = statusLabels[status];
  return label === undefined ? status : uiText(locale, label[0], label[1]);
}
export { economicActions, economicAuthority, economicLabels, economicStatus };
