import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { listOfficeAssignments } from '@helicraft/alhena';
import { useQuery } from '@tanstack/react-query';
import { LoadingState, Alert, EmptyState } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import { OfficeAssignmentCreator } from './office-assignment-creator';
import { OfficeAssignmentCard } from './office-assignment-card';
import styles from './states.module.scss';

function OfficeAssignments({ state }: Readonly<{ state: StateDetail }>): ReactElement {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['office-assignments', state.id],
    queryFn: async () => {
      const result = await listOfficeAssignments({
        client: browserClient(),
        path: { stateId: state.id },
        throwOnError: true,
      });
      return result.data.ids;
    },
  });
  return (
    <section className={styles.editor}>
      <h2>
        {uiText(locale, 'Назначения и снятия с должностей', 'Office appointments and removals')}
      </h2>
      <p>
        {uiText(
          locale,
          'Действующие назначения меняются отдельным решением. Процедура учитывает правила самой должности и полномочия по назначению или снятию. Принятые решения сохраняют историю и не переписывают конституцию.',
          'Current holders change through a separate decision. The procedure combines office rules with appointment or removal authority. Adopted decisions preserve history and do not rewrite the constitution.',
        )}
      </p>
      {state.status === 'ACTIVE' && state.configuration.governance.offices.length > 0 && (
        <OfficeAssignmentCreator key={state.governanceRevisionId} state={state} />
      )}
      {query.data?.length === 0 && (
        <EmptyState
          title={uiText(locale, 'Предложений о назначении пока нет', 'No office proposals yet')}
        >
          {uiText(
            locale,
            'Выберите должность и игрока выше. Решение будет выполнено после необходимых одобрений и голосований.',
            'Choose an office and a player above. Adoption follows the required approvals and votes.',
          )}
        </EmptyState>
      )}
      {(query.data ?? []).map((id) => (
        <OfficeAssignmentCard key={id} id={id} stateId={state.id} />
      ))}
      {query.isPending && (
        <LoadingState label={uiText(locale, 'Загрузка назначений…', 'Loading appointments…')} />
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { OfficeAssignments };
