import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { listAdminMonetaryDirectives } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { AdminMonetaryDirective } from './admin-directive';
import styles from './monetary.module.scss';

const route = getRouteApi('/admin');
function AdminMonetaryDirectives(): ReactElement {
  const { principal } = route.useRouteContext();
  const { text } = useTranslation();
  const query = useQuery({
    queryKey: ['admin-monetary-directives'],
    queryFn: async () => {
      const result = await listAdminMonetaryDirectives({
        client: browserClient(),
        throwOnError: true,
      });
      return result.data.items;
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  return (
    <section className={styles.panel}>
      <h1>{text('monetary.directives')}</h1>
      <p>{text('monetary.approvalsHelp')}</p>
      {query.isPending && <output>{text('monetary.loading')}</output>}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      {query.data?.length === 0 && <p>{text('monetary.emptyDirectives')}</p>}
      {query.data?.map((directive) => (
        <AdminMonetaryDirective
          key={directive.id}
          directive={directive}
          actorId={principal.id}
          onSaved={refresh}
        />
      ))}
    </section>
  );
}
export { AdminMonetaryDirectives };
