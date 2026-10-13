// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
import { uiText } from './text';
import { VotingCard } from './voting-card';
import { PollCreator } from './poll-creator';
import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache } from './use-prop-cache';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listVotings, listAdminVotings } from '@helicraft/alhena';

import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';

import styles from './states.module.scss';

function VotingsPage({ admin = false }: Readonly<{ admin?: boolean }>): ReactElement {
  const { locale } = useTranslation();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['votings', admin],
    queryFn: async () => {
      const result = await (admin ? listAdminVotings : listVotings)({
        client: browserClient(),
        throwOnError: true,
      });
      return result.data.ids;
    },
  });
  const callbackScope3 = useMemo(
    () => [admin, locale, queryClient, query.data, query.error],
    [admin, locale, queryClient, query.data, query.error],
  );
  const cachePollCreatorOnCreated =
    usePropCache<NonNullable<ComponentProps<typeof PollCreator>['onCreated']>>(callbackScope3);
  return (
    <section className={styles.page}>
      <h1>{uiText(locale, 'Голосования', 'Voting')}</h1>
      {admin && (
        <PollCreator
          onCreated={cachePollCreatorOnCreated('10952', () => {
            void queryClient.invalidateQueries({ queryKey: ['votings'] });
          })}
        />
      )}
      {(query.data ?? []).map((id) => (
        <VotingCard key={id} id={id} admin={admin} />
      ))}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}

export { VotingsPage };
