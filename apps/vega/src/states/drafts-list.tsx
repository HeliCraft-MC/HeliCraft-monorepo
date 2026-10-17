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
import { Alert, Button, ActionLink, StateCard, EmptyState } from '@helicraft/atria';
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
      <header>
        <h1>{uiText(locale, 'Мои государства', 'My states')}</h1>
        <p className={styles.hint}>
          {uiText(
            locale,
            'Все ваши гражданства в одном месте. Откройте государство для голосований, предложений и управления. Возможность нескольких гражданств определяется правилами каждого государства.',
            'All your citizenships in one place. Open a state for voting, proposals and management. Each state determines whether multiple citizenships are allowed.',
          )}
        </p>
      </header>
      {states.isPending && (
        <output>{uiText(locale, 'Загрузка государств…', 'Loading states…')}</output>
      )}
      {states.data?.length === 0 && (
        <EmptyState
          title={uiText(locale, 'Вы пока не состоите в государстве', 'No citizenships yet')}
        >
          {uiText(
            locale,
            'Посмотрите публичный каталог или подготовьте собственное государство ниже.',
            'Browse the public directory or prepare your own state below.',
          )}
          <ActionLink href="/states">
            {uiText(locale, 'Каталог государств', 'State directory')}
          </ActionLink>
        </EmptyState>
      )}
      <div className={styles.grid}>
        {(states.data ?? []).map((state) => (
          <StateCard
            key={state.id}
            name={displayText(state.name, locale) || state.slug}
            href={`/app/states/${state.id}/manage`}
            color={state.color}
            flag={null}
            government={label(state.status, locale)}
          />
        ))}
      </div>
      {states.error !== null && <Alert tone="danger">{errorMessage(states.error)}</Alert>}
      <h2>{uiText(locale, 'Черновики государств', 'State drafts')}</h2>
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
