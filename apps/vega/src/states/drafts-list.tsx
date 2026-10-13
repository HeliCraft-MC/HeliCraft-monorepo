import { uiText, displayText, label } from './text';
import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache, rowKey } from './use-prop-cache';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  createStateDraft,
  deleteStateDraft,
  listStateDrafts,
  listMyStates,
} from '@helicraft/alhena';
import type { StateDraft } from '@helicraft/alhena';
import { Alert, Button, ActionLink } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import styles from './states.module.scss';

function StateDraftsList(): ReactElement {
  const { locale } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const drafts = useQuery({
    queryKey: ['state-drafts'],
    queryFn: async () => {
      const result = await listStateDrafts({ client: browserClient(), throwOnError: true });
      return result.data.items;
    },
  });
  const states = useQuery({
    queryKey: ['my-states'],
    queryFn: async () => {
      const result = await listMyStates({ client: browserClient(), throwOnError: true });
      return result.data.items;
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      const result = await createStateDraft({
        client: browserClient(),
        body: { title: uiText(locale, 'Новое государство', 'New state') },
        throwOnError: true,
      });
      await navigate({ to: '/app/states/drafts/$draftId', params: { draftId: result.data.id } });
    },
  });
  const remove = useMutation({
    mutationFn: async (draft: StateDraft) => {
      await deleteStateDraft({
        client: browserClient(),
        path: { id: draft.id },
        body: { version: draft.version },
        throwOnError: true,
      });
      await queryClient.invalidateQueries({ queryKey: ['state-drafts'] });
    },
  });
  const callbackScope1 = useMemo(
    () => [locale, navigate, queryClient, drafts.data, drafts.error, create.mutate, remove.mutate],
    [locale, navigate, queryClient, drafts.data, drafts.error, create.mutate, remove.mutate],
  );
  const cacheButtonOnClick =
    usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(callbackScope1);
  return (
    <section className={styles.page}>
      {states.data && states.data.length > 0 && (
        <section>
          <h2>{uiText(locale, 'Мои государства', 'My states')}</h2>
          <ul>
            {states.data.map((state) => (
              <li key={state.id}>
                <ActionLink href={`/app/states/${state.id}`}>
                  {displayText(state.name, locale) || state.slug}
                </ActionLink>{' '}
                · {label(state.status, locale)}
              </li>
            ))}
          </ul>
        </section>
      )}
      {states.error !== null && <Alert tone="danger">{errorMessage(states.error)}</Alert>}
      <h1>{uiText(locale, 'Черновики государств', 'State drafts')}</h1>
      <p>
        {uiText(
          locale,
          'Продолжите сохранённый черновик или создайте новый. Государство появится только после финальной отправки.',
          'Resume a saved draft or create a new one. A state is created only on final submission.',
        )}
      </p>
      {drafts.isPending && <p>{uiText(locale, 'Загрузка…', 'Loading…')}</p>}
      <ul className={styles.list}>
        {(drafts.data ?? []).map((draft) => (
          <li key={draft.id} className={styles.card}>
            <ActionLink href={`/app/states/drafts/${draft.id}`}>
              {draft.title || uiText(locale, 'Без названия', 'Untitled')}
            </ActionLink>
            <time dateTime={draft.updatedAt}>
              {new Date(draft.updatedAt).toLocaleString(locale)}
            </time>
            <span>
              {draft.progress}% {uiText(locale, 'готово', 'complete')}
            </span>
            <Button
              tone="quiet"
              disabled={remove.isPending}
              onClick={cacheButtonOnClick(rowKey('2757', draft), () => {
                remove.mutate(draft);
              })}
            >
              {uiText(locale, 'Удалить черновик', 'Delete draft')}
            </Button>
          </li>
        ))}
      </ul>
      <Button
        disabled={create.isPending}
        onClick={cacheButtonOnClick('3033', () => {
          create.mutate();
        })}
      >
        {uiText(locale, 'Создать новый черновик', 'Create new draft')}
      </Button>
      {[drafts.error, create.error, remove.error]
        .filter((error) => error !== null)
        .map((error) => (
          <Alert key={errorMessage(error)} tone="danger">
            {errorMessage(error)}
          </Alert>
        ))}
    </section>
  );
}
export { StateDraftsList };
