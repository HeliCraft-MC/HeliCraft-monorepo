import type { ReactElement } from 'react';
import type { PublishedCompanyProfile } from '@helicraft/alhena';
import { FieldHelp } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { LegalIdentity } from './legal-identity';
import { companyActionLabel } from './labels';
import { CompanyProcedureSummary } from './procedure-summary';
import styles from './companies.module.scss';

function ProfileGovernance({
  profile,
}: Readonly<{ profile: PublishedCompanyProfile }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section className={styles.card}>
      <h2>{uiText(locale, 'Управление и должности', 'Governance and offices')}</h2>
      <FieldHelp
        label={uiText(locale, 'Корпоративные полномочия', 'Corporate authority')}
        content={uiText(
          locale,
          'Полномочия определяются этим уставом. Владение акциями само по себе не даёт права тратить деньги компании. Текст документа не изменяет указанные здесь процедуры.',
          'Authority follows this charter. Owning shares alone does not grant permission to spend company funds. Document prose does not change these procedures.',
        )}
      />
      {profile.charter.offices.length === 0 && (
        <p>{uiText(locale, 'Должности не предусмотрены.', 'No offices are configured.')}</p>
      )}
      {profile.charter.offices.map((office) => (
        <details key={office.id}>
          <summary>{displayText(office.name, locale)}</summary>
          <p>{displayText(office.description, locale)}</p>
          <p>
            {uiText(locale, 'Максимум должностных лиц', 'Maximum holders')}: {office.maxHolders}.{' '}
            {uiText(locale, 'Срок, дней', 'Term, days')}:{' '}
            {office.termDays ?? uiText(locale, 'без ограничения', 'unlimited')}.
          </p>
          {profile.holders
            .filter((holder) => holder.officeId === office.id)
            .map((holder) => (
              <p key={holder.player.owner.id}>
                <LegalIdentity identity={holder.player} />
              </p>
            ))}
          <h3>{uiText(locale, 'Назначение', 'Appointment')}</h3>
          <CompanyProcedureSummary
            procedure={office.appointment}
            offices={profile.charter.offices}
          />
          <h3>{uiText(locale, 'Отзыв', 'Removal')}</h3>
          <CompanyProcedureSummary procedure={office.removal} offices={profile.charter.offices} />
        </details>
      ))}
      <h3>{uiText(locale, 'Правила решений', 'Decision policies')}</h3>
      {profile.charter.policies.map((policy) => (
        <details key={policy.action}>
          <summary>{companyActionLabel(policy.action, locale)}</summary>
          <CompanyProcedureSummary procedure={policy.procedure} offices={profile.charter.offices} />
          {policy.financialBands.length > 0 && (
            <p>
              {uiText(
                locale,
                'Для отдельных сумм действуют дополнительные финансовые пороги. Точный применимый порядок проверяется при подготовке платежа.',
                'Amount-specific financial bands also apply. The exact applicable procedure is checked when preparing a payment.',
              )}
            </p>
          )}
        </details>
      ))}
      {profile.charter.policies.length === 0 && (
        <p>
          {uiText(
            locale,
            'Действия без настроенной политики недоступны.',
            'Actions without a configured policy are unavailable.',
          )}
        </p>
      )}
    </section>
  );
}
export { ProfileGovernance };
