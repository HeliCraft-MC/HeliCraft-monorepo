import { PageHeader } from '@helicraft/atria';
import type { ReactElement } from 'react';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyInboxSection } from './inbox-section';
import styles from './companies.module.scss';

function CompanyInboxPage({ actorId }: Readonly<{ actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section className={styles.page}>
      <header>
        <PageHeader
          title={uiText(locale, 'Входящие согласования', 'Approval inbox')}
          description={uiText(
            locale,
            'Здесь собраны ваши согласия и решения от имени компаний и государств. Откройте запрос, проверьте условия и подтвердите нужное действие.',
            'Your personal consents and actions on behalf of companies and states. Open a request, review the terms and confirm the required action.',
          )}
        />
      </header>
      <a href="/app/votings">
        {uiText(locale, 'Голосования с моим участием', 'Votings I can participate in')}
      </a>
      <CompanyInboxSection
        actorId={actorId}
        kind="FORMATION"
        title={uiText(locale, 'Учреждение и должности', 'Formation and appointments')}
      />
      <CompanyInboxSection
        actorId={actorId}
        kind="REGISTRATION"
        title={uiText(locale, 'Регистрация в государстве', 'State registration review')}
      />
      <CompanyInboxSection
        actorId={actorId}
        kind="STATE_DECISION"
        title={uiText(
          locale,
          'Одобрить или исполнить от государства',
          'Approve or execute for a state',
        )}
      />
      <CompanyInboxSection
        actorId={actorId}
        kind="COMPANY_DECISION"
        title={uiText(
          locale,
          'Одобрить или исполнить от компании',
          'Approve or execute for a company',
        )}
      />
      <CompanyInboxSection
        actorId={actorId}
        kind="SHARES"
        title={uiText(locale, 'Получение акций', 'Share acquisitions')}
      />
    </section>
  );
}
export { CompanyInboxPage };
