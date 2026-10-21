import { decisionPolicy } from '../states/decision-policy';
import type { Locale } from '../locales';
import { uiText } from '../states/text';
import type { StateDetail, MonetaryDirectivePayload, GovernancePolicy } from '@helicraft/alhena';

const economicActions = {
  SET_COMPANY_REGISTRATION_POLICY: 'SET_COMPANY_REGISTRATION_POLICY',
  REVIEW_COMPANY_REGISTRATION: 'REGISTER_COMPANY',
  REVIEW_COMPANY_BRANCH: 'REGISTER_COMPANY_BRANCH',
  CONSENT_COMPANY_FORMATION: 'PARTICIPATE_IN_COMPANY',
  VOTE_AS_SHAREHOLDER: 'PARTICIPATE_IN_COMPANY',
  ACCEPT_SHARE_ACQUISITION: 'ACQUIRE_COMPANY_SHARES',
  REVOKE_SHARE_ACQUISITION: 'ACQUIRE_COMPANY_SHARES',
  TRANSFER_COMPANY_SHARES: 'TRANSFER_COMPANY_SHARES',
  PUBLISH_FX_OFFER: 'MANAGE_FX_OFFERS',
  CANCEL_FX_OFFER: 'CANCEL_FX_OFFERS',
  APPROVE_INTERBANK_EXCHANGE: 'APPROVE_INTERBANK_EXCHANGE',
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
  SET_COMPANY_REGISTRATION_POLICY: ['Правила регистрации компаний', 'Company registration policy'],
  REVIEW_COMPANY_REGISTRATION: ['Рассмотрение регистрации компании', 'Company registration review'],
  REVIEW_COMPANY_BRANCH: ['Рассмотрение регистрации филиала', 'Branch registration review'],
  CONSENT_COMPANY_FORMATION: ['Согласие на учреждение компании', 'Consent to company formation'],
  VOTE_AS_SHAREHOLDER: ['Голос юридического лица', 'Legal entity ballot'],
  ACCEPT_SHARE_ACQUISITION: ['Согласие на приобретение акций', 'Consent to acquire shares'],
  REVOKE_SHARE_ACQUISITION: ['Отзыв согласия на акции', 'Revoke share acquisition consent'],
  TRANSFER_COMPANY_SHARES: ['Передача государственных долей', 'Transfer state-owned shares'],
  PUBLISH_FX_OFFER: [
    'Опубликовать обеспеченное валютное предложение',
    'Publish a reserved currency offer',
  ],
  CANCEL_FX_OFFER: ['Отменить валютное предложение', 'Cancel a currency offer'],
  APPROVE_INTERBANK_EXCHANGE: ['Утвердить межбанковский обмен', 'Approve an interbank exchange'],
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
