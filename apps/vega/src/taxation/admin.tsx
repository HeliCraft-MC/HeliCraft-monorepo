import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listAdminTaxOffices } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { BankReview } from '../monetary/bank-review';
import styles from '../monetary/monetary.module.scss';

function TaxOfficeAdministration(): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['admin-tax-offices'],
    queryFn: async () => {
      const result = await listAdminTaxOffices({ client: browserClient(), throwOnError: true });
      return result.data.items;
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  return (
    <section className={styles.panel}>
      <h1>{uiText(locale, 'Налоговые службы', 'Tax offices')}</h1>
      <p>
        {uiText(
          locale,
          'Администрация ратифицирует утверждённый государством веб-институт. Это не проверка здания и не право устанавливать налоговые ставки.',
          'Administration ratifies a state-approved web institution. This is not building verification or authority to set tax rates.',
        )}
      </p>
      {query.isPending && (
        <output>{uiText(locale, 'Загрузка заявок…', 'Loading applications…')}</output>
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data?.length === 0 && (
        <p>{uiText(locale, 'Заявок пока нет.', 'No applications yet.')}</p>
      )}
      {query.data?.map((office) => (
        <BankReview
          key={`${office.id}:${office.status}`}
          bank={office}
          taxOffice
          onSaved={refresh}
        />
      ))}
    </section>
  );
}
export { TaxOfficeAdministration };
