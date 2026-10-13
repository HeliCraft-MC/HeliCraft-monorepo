import { uiText } from './text';
import { AdminStateEditor } from './admin-editor';

import type { ReactElement } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getAdminState } from '@helicraft/alhena';
import type { Principal } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';

function AdminStatePage({
  id,
  principal,
}: Readonly<{ id: string; principal: Principal }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['admin-state', id, locale],
    queryFn: async () => {
      const result = await getAdminState({
        client: browserClient(),
        path: { id },
        query: { locale },
        throwOnError: true,
      });
      return result.data;
    },
  });
  if (query.isPending) {
    return <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>;
  }
  if (query.isError) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  return (
    <AdminStateEditor
      key={query.data.governanceRevisionId + query.data.status}
      state={query.data}
      principal={principal}
    />
  );
}

export { AdminStatePage };
