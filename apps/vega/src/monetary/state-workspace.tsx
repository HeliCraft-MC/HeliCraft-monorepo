// oxlint-disable import/max-dependencies -- State monetary composition combines existing policy presentation with the ledger and proposal forms.
import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStateMonetary } from '@helicraft/alhena';
import type { StateDetail } from '@helicraft/alhena';
import { Alert, FieldHelp } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { PublicGovernment } from '../states/public-government';
import { DirectiveComposer } from './directive-composer';
import { DirectiveCard } from './directive-card';
import { MonetaryPagination } from './pagination';
import { MonetaryHistory } from './history';
import styles from './monetary.module.scss';

import { hasMonetaryPolicies } from './model';
import type { DirectiveKind, MonetarySection } from './model';
import { MonetaryOverview } from './overview';

const initialKinds: Record<MonetarySection, DirectiveKind> = {
  bank: 'ESTABLISH_BANK',
  currency: 'CREATE_CURRENCY',
  'monetary-policy': 'CHANGE_POLICY',
  issuance: 'ISSUE',
  'bank-finances': 'BANK_TRANSFER',
  treasury: 'TREASURY_TRANSFER',
};
function StateMonetaryWorkspace({
  state,
  actorId,
  section,
}: Readonly<{ state: StateDetail; actorId: string; section: MonetarySection }>): ReactElement {
  const { text } = useTranslation();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['state-monetary', state.id, page],
    queryFn: async () => {
      const result = await getStateMonetary({
        client: browserClient(),
        path: { stateId: state.id },
        query: { page },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    setPage(1);
    void refetch();
  }, [refetch]);
  const { data } = query;
  const currencyList = useMemo(() => (data?.currency ? [data.currency] : []), [data]);
  if (query.isPending) {
    return <output>{text('monetary.loading')}</output>;
  }
  if (!data) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  return (
    <section className={styles.panel}>
      <MonetaryOverview data={data} section={section} />
      <details>
        <summary>
          {text('monetary.action')}{' '}
          <FieldHelp label={text('monetary.action')} content={text('monetary.authorityHelp')} />
        </summary>
        <PublicGovernment state={state} />
        <p>
          {text(
            hasMonetaryPolicies(state) ? 'monetary.authorityReformHint' : 'monetary.noAuthority',
          )}
        </p>
      </details>
      <DirectiveComposer
        key={section}
        initialKind={initialKinds[section]}
        state={state}
        actorId={actorId}
        monetary={data}
        onSaved={refresh}
      />
      <section className={styles.panel}>
        <h2>{text('monetary.directives')}</h2>
        {data.directives.length === 0 && <p>{text('monetary.emptyDirectives')}</p>}
        {data.directives.map((directive) => (
          <DirectiveCard
            key={directive.id}
            directive={directive}
            state={state}
            actorId={actorId}
            code={data.currency?.code ?? ''}
            onSaved={refresh}
          />
        ))}
      </section>
      <MonetaryHistory transactions={data.transactions} currencies={currencyList} />
      <MonetaryPagination page={data.page} hasMore={data.hasMore} onPage={setPage} />
    </section>
  );
}
export { StateMonetaryWorkspace };
