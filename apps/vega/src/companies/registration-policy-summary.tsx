import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, getPublishedCompanyRegistrationPolicy } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { PolicyTerms } from './policy-terms';

function RegistrationPolicySummary({ stateId }: Readonly<{ stateId: string }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['company-registration-policy', stateId],
    queryFn: async () => {
      const result = await getPublishedCompanyRegistrationPolicy({
        client: createClient({ credentials: 'omit' }),
        path: { id: stateId },
        throwOnError: true,
      });
      return result.data;
    },
  });
  if (query.isPending) {
    return <p>{uiText(locale, 'Загрузка правил…', 'Loading policy…')}</p>;
  }
  if (query.isError) {
    return (
      <Alert tone="danger">
        {uiText(locale, 'Правила недоступны.', 'Registration policy unavailable.')}
      </Alert>
    );
  }
  return query.data === null ? (
    <Alert tone="info">
      {uiText(
        locale,
        'Государство ещё не утвердило правила. Регистрация недоступна до решения Governance.',
        'The state has not adopted a registration policy. Registration remains unavailable until its Governance decision.',
      )}
    </Alert>
  ) : (
    <PolicyTerms policy={query.data.policy} />
  );
}
export { RegistrationPolicySummary };
