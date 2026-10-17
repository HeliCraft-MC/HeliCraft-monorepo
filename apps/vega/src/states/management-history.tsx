import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listStateRevisions } from '@helicraft/alhena';
import { LoadingState, Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import styles from './states.module.scss';

function ManagementHistory({ stateId }: Readonly<{ stateId: string }>): ReactElement {
  const { locale } = useTranslation();
  const history = useQuery({
    queryKey: ['state-history', stateId],
    queryFn: async () => {
      const result = await listStateRevisions({
        client: browserClient(),
        path: { id: stateId },
        throwOnError: true,
      });
      return result.data.items;
    },
  });
  return (
    <section>
      <h2>{uiText(locale, 'История изменений', 'Revision history')}</h2>
      <p>
        {uiText(
          locale,
          'Каждая опубликованная редакция сохраняется. Изменение имени или правил создаёт новую редакцию.',
          'Every published revision is retained. Changing the name or rules creates a new revision.',
        )}
      </p>
      <ol className={styles.list}>
        {(history.data ?? []).map((revision) => (
          <li className={styles.card} key={revision.id}>
            <strong>
              {uiText(locale, 'Редакция', 'Revision')} {revision.number}
            </strong>
            <time dateTime={revision.createdAt}>
              {new Date(revision.createdAt).toLocaleString(locale)}
            </time>
            {revision.reason !== null && <p>{revision.reason}</p>}
          </li>
        ))}
      </ol>
      {history.isPending && (
        <LoadingState label={uiText(locale, 'Загрузка истории…', 'Loading history…')} />
      )}
      {history.error !== null && <Alert tone="danger">{errorMessage(history.error)}</Alert>}
    </section>
  );
}
export { ManagementHistory };
