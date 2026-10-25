import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { Link } from '@tanstack/react-router';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { FormSection } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyStateIdentity } from './state-identity';
import styles from './companies.module.scss';

function CompanyOverview({ workspace }: Readonly<{ workspace: CompanyWorkspace }>): ReactElement {
  const { locale } = useTranslation();
  const params = useMemo(() => ({ id: workspace.id }), [workspace.id]);
  const ownership = useMemo(() => ({ section: 'ownership' as const }), []);
  const offices = useMemo(() => ({ section: 'offices' as const }), []);
  const decisions = useMemo(() => ({ section: 'decisions' as const }), []);
  return (
    <section>
      <div className={styles.metrics}>
        <Link to="/app/companies/$id" params={params} search={ownership}>
          <span>{uiText(locale, 'Выпущено акций', 'Issued shares')}</span>
          <strong>{workspace.issuedShares}</strong>
        </Link>
        <Link to="/app/companies/$id" params={params} search={ownership}>
          <span>{uiText(locale, 'Собственники', 'Shareholders')}</span>
          <strong>{workspace.shareholders.length}</strong>
        </Link>
        <Link to="/app/companies/$id" params={params} search={offices}>
          <span>{uiText(locale, 'Действующие назначения', 'Current appointments')}</span>
          <strong>{workspace.holders.length}</strong>
        </Link>
      </div>
      <FormSection title={uiText(locale, 'О компании', 'About the company')}>
        <p>
          {displayText(workspace.content.description, locale) ||
            uiText(locale, 'Описание пока не заполнено.', 'No description yet.')}
        </p>
        <dl className={styles.facts}>
          <div>
            <dt>{uiText(locale, 'Государство регистрации', 'Registration jurisdiction')}</dt>
            <dd>
              <CompanyStateIdentity id={workspace.registrationStateId} />
            </dd>
          </div>
          <div>
            <dt>{uiText(locale, 'Должности по уставу', 'Charter offices')}</dt>
            <dd>{workspace.content.charter.offices.length}</dd>
          </div>
        </dl>
      </FormSection>
      <FormSection title={uiText(locale, 'Быстрые действия', 'Quick actions')}>
        <Link to="/app/companies/$id" params={params} search={decisions}>
          {uiText(locale, 'Решения и согласования компании', 'Company decisions and approvals')}
        </Link>
        <Link to="/app/companies/$id" params={params} search={offices}>
          {uiText(locale, 'Должности и назначения', 'Offices and appointments')}
        </Link>
        <a href="/app/notifications">
          {uiText(
            locale,
            'Входящие запросы от всех участников',
            'Approval inbox for all participants',
          )}
        </a>
      </FormSection>
    </section>
  );
}
export { CompanyOverview };
