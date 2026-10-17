// oxlint-disable import/max-dependencies -- State tax composition reuses exact money, localized law forms and shared Governance evidence.
import { useCallback, useState } from 'react';
import type { ReactElement, MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStateTaxation } from '@helicraft/alhena';
import type { StateDetail, TaxLawRevision } from '@helicraft/alhena';
import { Alert, Button, FieldHelp, MoneyAmount } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { DirectiveCard } from '../monetary/directive-card';
import { MonetaryPagination } from '../monetary/pagination';
import { TaxAssessments } from './assessments';
import { TaxEditor } from './editor';
import type { TaxKind } from './compose';
import { economicAuthority, economicStatus } from './model';
import styles from '../monetary/monetary.module.scss';

const PERCENT_BPS = 100;

// oxlint-disable-next-line max-lines-per-function -- The composed state workspace lists institution, laws, decisions and exact receipts; domain rules stay in Antares.
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
    return <output>{uiText(locale, 'Загрузка налоговой системы…', 'Loading taxation…')}</output>;
  }
  if (data === undefined) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  const latest = data.laws.filter(
    (revision) =>
      !data.laws.some((other) => other.lawId === revision.lawId && other.number > revision.number),
  );
  return (
    <section className={styles.panel}>
      <h2>{uiText(locale, 'Налоговая система', 'Taxation')}</h2>
      {data.office === null || data.office.status === 'REJECTED' ? (
        <>
          <p>
            {uiText(
              locale,
              'Налоговая служба ещё не действует. Уполномоченный гражданин предлагает устав, государство утверждает его по Governance, затем администрация ратифицирует веб-институт с обоснованием. Физическое здание не проверяется.',
              'The tax office is not active. An authorized citizen proposes its charter, the state approves under Governance, then administration ratifies the web institution with a reason. No physical building is verified.',
            )}
          </p>
          <TaxEditor
            state={state}
            actorId={actorId}
            kind="ESTABLISH_TAX_OFFICE"
            onSaved={refresh}
          />
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
            'Каждый закон применяется один раз от исходной суммы. Соглашение может урегулировать совпадающие требования двух сторон; права третьего государства сохраняются.',
            'Each law applies once to the original amount. A treaty may settle overlapping claims of two parties; a third state retains its rights.',
          )}
        />
      </p>
      {data.office?.status === 'ACTIVE' && economicAuthority(state, actorId, 'ENACT_TAX_LAW') && (
        <Button value="ENACT_TAX_LAW" onClick={edit}>
          {uiText(locale, 'Новый налоговый закон', 'New tax law')}
        </Button>
      )}
      {editor !== null && (
        <TaxEditor
          key={`${editor.kind}:${editor.revision?.id ?? 'new'}`}
          state={state}
          actorId={actorId}
          kind={editor.kind}
          revision={editor.revision}
          onSaved={refresh}
        />
      )}
      <h3>{uiText(locale, 'Налоговые законы', 'Tax laws')}</h3>
      {latest.length === 0 && (
        <p>{uiText(locale, 'Принятых законов пока нет.', 'No enacted laws yet.')}</p>
      )}
      {latest.map((revision) => (
        <article className={styles.card} key={revision.id}>
          <h4>
            <a href={`/tax-laws/${revision.lawId}`}>{displayText(revision.name, locale)}</a> · №{' '}
            {revision.number}
          </h4>
          <p>
            {economicStatus(locale, revision.status)} · {revision.rule.rateBps / PERCENT_BPS}% ·{' '}
            {revision.rule.category} · {new Date(revision.effectiveAt).toLocaleString(locale)}
          </p>
          <p>{displayText(revision.description, locale)}</p>
          {revision.status !== 'REPEALED' && (
            <div className={styles.actions}>
              {economicAuthority(state, actorId, 'AMEND_TAX_LAW') && (
                <Button value={`AMEND_TAX_LAW:${revision.id}`} onClick={edit}>
                  {uiText(locale, 'Изменить закон', 'Amend law')}
                </Button>
              )}
              {economicAuthority(state, actorId, 'REPEAL_TAX_LAW') && (
                <Button tone="quiet" value={`REPEAL_TAX_LAW:${revision.id}`} onClick={edit}>
                  {uiText(locale, 'Отменить закон', 'Repeal law')}
                </Button>
              )}
            </div>
          )}
          <details>
            <summary>{uiText(locale, 'История редакций', 'Revision history')}</summary>
            {data.laws
              .filter((item) => item.lawId === revision.lawId)
              .map((item) => (
                <p key={item.id}>
                  № {item.number} · {economicStatus(locale, item.status)} ·{' '}
                  {item.rule.rateBps / PERCENT_BPS}% · {item.effectiveAt} · {item.id}
                </p>
              ))}
          </details>
        </article>
      ))}
      <h3>{uiText(locale, 'Государственные решения', 'State decisions')}</h3>
      {data.directives.length === 0 && (
        <p>{uiText(locale, 'Предложений пока нет.', 'No proposals yet.')}</p>
      )}
      {data.directives.map((directive) => (
        <DirectiveCard
          key={directive.id}
          directive={directive}
          state={state}
          actorId={actorId}
          code=""
          onSaved={refresh}
        />
      ))}
      <TaxAssessments data={data} />
      <h3>{uiText(locale, 'Налоговые поступления', 'Tax receipts')}</h3>
      {data.totals.length === 0 && (
        <p>
          {uiText(locale, 'Начислений и поступлений пока нет.', 'No assessments or receipts yet.')}
        </p>
      )}
      {data.totals.map((total) => (
        <p key={total.currencyId}>
          <MoneyAmount
            minor={total.amountMinor}
            code={data.currencies.find((currency) => currency.id === total.currencyId)?.code ?? ''}
            locale={locale}
          />
        </p>
      ))}
      {data.receipts.map((receipt) => (
        <details key={receipt.journalId}>
          <summary>
            <MoneyAmount
              minor={receipt.amountMinor}
              code={
                data.currencies.find((currency) => currency.id === receipt.currencyId)?.code ?? ''
              }
              locale={locale}
            />{' '}
            · {new Date(receipt.createdAt).toLocaleString(locale)}
          </summary>
          <p>
            {uiText(locale, 'Начисление', 'Assessment')}: {receipt.assessmentId}
          </p>
          <p>
            {uiText(locale, 'Экономическая операция', 'Economic operation')}: {receipt.operationId}
          </p>
          <p>
            {uiText(locale, 'Проводка', 'Journal')}: {receipt.journalId}
          </p>
          {receipt.laws.map((law) => (
            <p key={law.revisionId}>
              <a href={`/tax-laws/${law.lawId}`}>{displayText(law.name, locale)}</a> · №{' '}
              {law.number} · {law.revisionId}
            </p>
          ))}
          {receipt.treatyId !== null && (
            <p>
              <a href={`/treaties/${receipt.treatyId}`}>
                {displayText(receipt.treatyName, locale)}
              </a>{' '}
              · {receipt.treatyRevisionId}
            </p>
          )}
        </details>
      ))}
      <MonetaryPagination page={data.page} hasMore={data.hasMore} onPage={setPage} />
      <a href={`/app/states/${state.id}/manage?section=diplomacy`}>
        {uiText(locale, 'Международные договоры', 'International treaties')}
      </a>
    </section>
  );
}
export { TaxationWorkspace };
