// oxlint-disable import/max-dependencies -- The state shell composes typed API data, navigation and the selected workspace.
import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { createStateReformDraft, getOwnedState } from '@helicraft/alhena';
import { Alert, LoadingState, WorkspaceContent, WorkspaceLayout } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, label, uiText } from './text';
import { ManagementSections } from './management-sections';
import type { ManagementSection } from './management-sections';
import { managementSections } from './management-access';
import { ManagementNavigation } from './management-navigation';
import { managementLabels } from './management-labels';
import styles from './management.module.scss';

function StateManagementPanel({
  stateId,
  actorId,
  section,
  shareOperationId,
  formationDraftId,
  votingId,
}: Readonly<{
  stateId: string;
  actorId: string;
  section: ManagementSection;
  shareOperationId?: string;
  formationDraftId?: string;
  votingId?: string;
}>): ReactElement {
  const { locale } = useTranslation();
  const navigate = useNavigate();
  const state = useQuery({
    queryKey: ['owned-state', stateId, locale],
    queryFn: async () => {
      const result = await getOwnedState({
        client: browserClient(),
        path: { id: stateId },
        query: { locale },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const reform = useMutation({
    mutationFn: async () => {
      const result = await createStateReformDraft({
        client: browserClient(),
        path: { id: stateId },
        throwOnError: true,
      });
      await navigate({
        to: '/app/states/drafts/$draftId',
        params: { draftId: result.data.draftId },
      });
    },
  });
  const { mutate } = reform;
  const start = useCallback((): void => {
    mutate();
  }, [mutate]);
  const color = state.data?.configuration.color ?? '#859b76';
  const publicParams = useMemo(() => ({ slug: state.data?.slug ?? '' }), [state.data?.slug]);
  if (!state.data) {
    return (
      <main id="main-content" className={styles.pending}>
        {state.isPending ? (
          <LoadingState label={uiText(locale, 'Загрузка государства…', 'Loading state…')} />
        ) : (
          <>
            <Alert tone="danger">{errorMessage(state.error)}</Alert>
            <Link to="/app/states/new">{uiText(locale, 'Мои государства', 'My states')}</Link>
          </>
        )}
      </main>
    );
  }
  const sections = managementSections(state.data, actorId);
  const selected = section === 'identity' || section === 'constitution' ? 'overview' : section;
  const accessible = sections.includes(selected);
  const name = displayText(state.data.configuration.name, locale);
  return (
    <WorkspaceLayout className={styles.panel} accent={color}>
      <ManagementNavigation
        stateId={stateId}
        stateName={name}
        flag={state.data.configuration.horizontalFlag}
        section={selected}
        sections={sections}
      />
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.eyebrow}>{name}</span>
            <h1>{uiText(locale, managementLabels[selected][0], managementLabels[selected][1])}</h1>
          </div>
          <div className={styles.headerActions}>
            <span className={styles.status}>{label(state.data.status, locale)}</span>
            {state.data.status === 'ACTIVE' && (
              <Link to="/states/$slug" params={publicParams}>
                {uiText(locale, 'Публичная страница', 'Public page')}
              </Link>
            )}
          </div>
        </header>
        <WorkspaceContent className={styles.content}>
          {state.data.status !== 'ACTIVE' && state.data.statusReason !== null && (
            <Alert>{state.data.statusReason}</Alert>
          )}
          {accessible ? (
            <ManagementSections
              votingId={votingId}
              formationDraftId={formationDraftId}
              shareOperationId={shareOperationId}
              key={`${stateId}:${selected}`}
              state={state.data}
              actorId={actorId}
              section={selected}
              onReform={start}
              pending={reform.isPending}
            />
          ) : (
            <Alert>
              {uiText(
                locale,
                'Этот раздел недоступен с вашими текущими полномочиями. Выберите доступный раздел в меню.',
                'This section is unavailable with your current authority. Choose an available section from the menu.',
              )}
            </Alert>
          )}
          {state.error !== null && <Alert tone="danger">{errorMessage(state.error)}</Alert>}
          {reform.error !== null && <Alert tone="danger">{errorMessage(reform.error)}</Alert>}
        </WorkspaceContent>
      </div>
    </WorkspaceLayout>
  );
}
export { StateManagementPanel };
