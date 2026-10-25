// oxlint-disable import/max-dependencies -- State tax composition reuses exact money, localized law forms and shared Governance evidence.
import { useCallback, useState } from 'react';
import type { ReactElement, MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStateTaxation } from '@helicraft/alhena';
import type { StateDetail, TaxLawRevision } from '@helicraft/alhena';
import { LoadingState, Alert, Button, FieldHelp, Dialog, ActionPanel } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { MonetaryPagination } from '../monetary/pagination';
import { TaxEditor } from './editor';
import type { TaxKind } from './compose';
import { economicAuthority, economicStatus } from './model';
import { TaxationRecords } from './workspace-records';
import styles from '../monetary/monetary.module.scss';

function TaxationWorkspace({
  state,
  actorId,
}: Readonly<{ state: StateDetail; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ kind: TaxKind; revision?: TaxLawRevision } | null>(null);
  const query = useQuery({
    queryKey: ['taxation', state.id, page],
    queryFn: async () => {
      const result = await getStateTaxation({
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
    void refetch();
  }, [refetch]);
  const closeEditor = useCallback((open: boolean): void => {
    if (!open) {
      setEditor(null);
    }
  }, []);
  const editorSaved = useCallback((): void => {
    setEditor(null);
    void refetch();
  }, [refetch]);
  const { data } = query;
  const edit = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const [kind, id] = event.currentTarget.value.split(':');
      if (
        kind === 'ENACT_TAX_LAW' ||
        kind === 'CHANGE_TAX_CHARTER' ||
        kind === 'ESTABLISH_TAX_OFFICE' ||
        kind === 'AMEND_TAX_LAW' ||
        kind === 'REPEAL_TAX_LAW'
      ) {
        setEditor({ kind, revision: data?.laws.find((revision) => revision.id === id) });
      }
    },
    [data],
  );
  if (query.isPending) {
    return (
      <LoadingState label={uiText(locale, 'Загрузка налоговой системы…', 'Loading taxation…')} />
    );
  }
  if (data === undefined) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  return (
    <section className={styles.panel}>
      <h2>{uiText(locale, 'Налоговая система', 'Taxation')}</h2>
      {data.office === null || data.office.status === 'REJECTED' ? (
        <>
          <p>
            {uiText(
              locale,
              'Налоговая служба ещё не действует. Уполномоченный гражданин предлагает устав, государство утверждает его по своим правилам, затем администрация ратифицирует веб-институт с обоснованием. Физическое здание не проверяется.',
              'The tax office is not active. An authorized citizen proposes its charter, the state approves under Governance, then administration ratifies the web institution with a reason. No physical building is verified.',
            )}
          </p>
          <ActionPanel
            title={uiText(locale, 'Учредить налоговую службу', 'Establish a tax office')}
          >
            <TaxEditor
              state={state}
              actorId={actorId}
              kind="ESTABLISH_TAX_OFFICE"
              onSaved={refresh}
            />
          </ActionPanel>
        </>
      ) : (
        <article className={styles.card}>
          <h3>{displayText(data.office.name, locale)}</h3>
          <p>{displayText(data.office.description, locale)}</p>
          <strong>{economicStatus(locale, data.office.status)}</strong>
          <a href={`/states/${state.slug}/taxation`}>
            {uiText(locale, 'Публичная налоговая политика', 'Public tax policy')}
          </a>
          {data.office.status === 'ACTIVE' &&
            economicAuthority(state, actorId, 'CHANGE_TAX_CHARTER') && (
              <Button value="CHANGE_TAX_CHARTER" onClick={edit}>
                {uiText(locale, 'Изменить устав', 'Change charter')}
              </Button>
            )}
        </article>
      )}
      <p>
        {uiText(
          locale,
          'Несколько самостоятельных законов могут облагать один перевод.',
          'Several independent laws may tax one transfer.',
        )}{' '}
        <FieldHelp
          label={uiText(locale, 'Множественное налогообложение', 'Multiple taxation')}
          content={uiText(
            locale,
            'Каждый закон применяется один раз со своей налоговой базой и плательщиком. Соглашение может урегулировать совпадающие требования двух сторон к одному плательщику; права третьего государства сохраняются.',
            'Each law applies once with its own base and taxpayer. A treaty may settle overlapping claims of two parties against one taxpayer; a third state retains its rights.',
          )}
        />
      </p>
      {data.office?.status === 'ACTIVE' && economicAuthority(state, actorId, 'ENACT_TAX_LAW') && (
        <Button value="ENACT_TAX_LAW" onClick={edit}>
          {uiText(locale, 'Новый налоговый закон', 'New tax law')}
        </Button>
      )}
      <Dialog
        open={editor !== null}
        onOpenChange={closeEditor}
        size="fullscreen"
        title={uiText(locale, 'Налоговое решение', 'Tax decision')}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        {editor !== null && (
          <TaxEditor
            key={`${editor.kind}:${editor.revision?.id ?? 'new'}`}
            state={state}
            actorId={actorId}
            kind={editor.kind}
            revision={editor.revision}
            onSaved={editorSaved}
          />
        )}
      </Dialog>
      <TaxationRecords
        data={data}
        state={state}
        actorId={actorId}
        onEdit={edit}
        onSaved={refresh}
      />
      <MonetaryPagination page={data.page} hasMore={data.hasMore} onPage={setPage} />
      <a href={`/app/states/${state.id}/manage?section=diplomacy`}>
        {uiText(locale, 'Международные договоры', 'International treaties')}
      </a>
    </section>
  );
}
export { TaxationWorkspace };
