import { monetaryLabel } from './labels';
import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listAdminCentralBanks } from '@helicraft/alhena';
import type { CentralBank } from '@helicraft/alhena';
import { Alert, FormField, Select } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import styles from './monetary.module.scss';

import { BankReview } from './bank-review';

function BankAdministration(): ReactElement {
  const { text } = useTranslation();
  const [status, setStatus] = useState<CentralBank['status'] | undefined>('PENDING');
  const query = useQuery({
    queryKey: ['admin-banks', status],
    queryFn: async () => {
      const result = await listAdminCentralBanks({
        client: browserClient(),
        query: { status },
        throwOnError: true,
      });
      return result.data.items;
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  const change = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    const { value } = event.currentTarget;
    setStatus(
      value === 'PENDING' || value === 'ACTIVE' || value === 'REJECTED' || value === 'SUSPENDED'
        ? value
        : undefined,
    );
  }, []);
  return (
    <section className={styles.panel}>
      <h1>{text('monetary.moderation')}</h1>
      <p>{text('monetary.reviewHint')}</p>
      <FormField label={text('monetary.status')} htmlFor="bank-status-filter">
        <Select id="bank-status-filter" value={status ?? ''} onChange={change}>
          <option value="">{text('monetary.all')}</option>
          {['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'].map((value) => (
            <option key={value} value={value}>
              {monetaryLabel(text, value)}
            </option>
          ))}
        </Select>
      </FormField>
      {query.isPending && <output>{text('monetary.loading')}</output>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data?.length === 0 && <p>{text('monetary.emptyDirectives')}</p>}
      {query.data?.map((bank) => (
        <BankReview bank={bank} onSaved={refresh} key={bank.id} />
      ))}
    </section>
  );
}
export { BankAdministration };
