import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCompanyFormationProgress } from '@helicraft/alhena';
import type { CompanyDraft } from '@helicraft/alhena';
import { Icon, Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyOwnerIdentity } from './owner-identity';
import styles from './companies.module.scss';

function CompanyFormationProgress({ draft }: Readonly<{ draft: CompanyDraft }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['company-formation-progress', draft.id, draft.formationHash],
    queryFn: async () => {
      const result = await getCompanyFormationProgress({
        client: browserClient(),
        path: { id: draft.id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return (
    <section aria-label={uiText(locale, 'Статус согласований', 'Consent progress')}>
      {query.isPending && <p>{uiText(locale, 'Проверка согласий…', 'Checking consents…')}</p>}
      <ul className={styles.consentList}>
        {query.data?.items.map((item) => (
          <li key={`${item.owner.type}:${item.owner.id}:${item.role}`}>
            <CompanyOwnerIdentity owner={item.owner} />
            <span>
              {item.role === 'FOUNDER'
                ? uiText(locale, 'Учредитель', 'Founder')
                : uiText(locale, 'Должностное лицо', 'Office holder')}
            </span>
            <strong>
              {item.confirmed && <Icon name="check" />}{' '}
              {item.confirmed
                ? uiText(locale, 'Согласие получено', 'Consent received')
                : uiText(locale, 'Ожидает согласия', 'Awaiting consent')}
            </strong>
          </li>
        ))}
      </ul>
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { CompanyFormationProgress };
