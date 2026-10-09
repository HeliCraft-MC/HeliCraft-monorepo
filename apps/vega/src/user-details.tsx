import { getRouteApi } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { getUserDetails } from '@helicraft/alhena';
import { Alert, Spinner } from '@helicraft/atria';
import { browserClient } from './account-api';
import { UserDetailsForm } from './user-details-form';

const detailRoute = getRouteApi('/admin/users/$userId');
const route = getRouteApi('/admin');
function UserDetails(): ReactElement {
  const { userId: uuid } = detailRoute.useParams();
  const { principal } = route.useRouteContext();
  const result = useQuery({
    queryKey: ['user', uuid],
    queryFn: async () => {
      const { data } = await getUserDetails({
        client: browserClient(),
        path: { uuid },
        throwOnError: true,
      });
      return data;
    },
  });
  const refresh = useCallback(async (): Promise<void> => {
    await result.refetch();
  }, [result]);
  if (result.isPending) {
    return <Spinner />;
  }
  if (result.isError) {
    return <Alert tone="danger">Пользователь недоступен</Alert>;
  }
  return (
    <UserDetailsForm
      key={JSON.stringify(result.data)}
      user={result.data}
      principal={principal}
      onRefresh={refresh}
    />
  );
}
export { UserDetails };
