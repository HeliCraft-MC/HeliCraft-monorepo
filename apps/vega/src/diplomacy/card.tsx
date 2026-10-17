// oxlint-disable import/max-dependencies -- Treaty card composes independent state decisions, immutable revision review and the shared confirmation dialog.
import { useCallback, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { submitTreatyDraft } from '@helicraft/alhena';
import type { Treaty, StateDetail, MonetaryDirectivePayload } from '@helicraft/alhena';
import { Alert, Button, Dialog, FieldHelp } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { useDirectiveSubmission } from '../monetary/use-directive-submission';
import { economicAuthority, economicStatus } from '../taxation/model';
import { TreatyHistory } from './history';
import { TreatyParties } from './parties';
import { TreatyWizard } from './wizard';
import styles from '../monetary/monetary.module.scss';

const PERCENT_BPS = 100;
const BASIS_POINTS = 10_000;

// oxlint-disable-next-line max-lines-per-function, complexity -- The card composes independent immutable revision and approval states; all state authority is enforced in Antares.
function TreatyCard({
  treaty,
  state,
  actorId,
  onSaved,
}: Readonly<{
  treaty: Treaty;
  state: StateDetail;
  actorId: string;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const [editing, setEditing] = useState(false);
  const current = treaty.revisions.find((revision) => revision.id === treaty.currentRevisionId);
  const active = treaty.revisions.find((revision) => revision.id === treaty.activeRevisionId);
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { setReview, confirm: handleConfirm, changeOpen: handleChangeOpen } = submission;
  const send = useMutation({
    mutationFn: async () => {
      if (current === undefined) {
        return;
      }
      await submitTreatyDraft({
        client: browserClient(),
        path: { stateId: state.id, id: treaty.id },
        body: { revisionId: current.id },
        throwOnError: true,
      });
    },
    onSuccess: onSaved,
  });
  const { mutate } = send;
  const submit = useCallback((): void => {
    mutate();
  }, [mutate]);
  const edit = useCallback((): void => {
    setEditing((value) => !value);
  }, []);
  const decision = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const kind = event.currentTarget.value;
      const revision = kind === 'DENOUNCE_TREATY' ? active : current;
      if (
        revision !== undefined &&
        (kind === 'RATIFY_TREATY' ||
          kind === 'AMEND_TREATY' ||
          kind === 'DENOUNCE_TREATY' ||
          kind === 'REJECT_TREATY')
      ) {
        const payload: MonetaryDirectivePayload = {
          kind,
          treatyId: treaty.id,
          revisionId: revision.id,
          contentHash: revision.contentHash,
        };
        setReview({ idempotencyKey: crypto.randomUUID(), payload });
      }
    },
    [active, current, treaty.id, setReview],
  );
  if (current === undefined) {
    return (
      <Alert tone="danger">{uiText(locale, 'Редакция недоступна.', 'Revision unavailable.')}</Alert>
    );
  }
  const { terms } = current.content;
  const ratifyKind = treaty.activeRevisionId === null ? 'RATIFY_TREATY' : 'AMEND_TREATY';
  return (
    <article className={styles.card}>
      <h3>
        {displayText(current.content.name, locale)} · № {current.number}
      </h3>
      <strong>{economicStatus(locale, treaty.status)}</strong>
      <TreatyParties parties={treaty.parties} />
      <p>{displayText(current.content.description, locale)}</p>
      <p>
        {current.content.category} ·{' '}
        {current.content.terms.mode === 'SHARED'
          ? uiText(locale, 'Общая ставка с распределением', 'Shared tax rate')
          : uiText(locale, 'Исключительное право', 'Exclusive taxation')}{' '}
        · {new Date(current.content.effectiveAt).toLocaleString(locale)}
      </p>
      {current.content.terms.mode === 'SHARED' && (
        <p>
          {current.content.terms.rateBps / PERCENT_BPS}% ·{' '}
          {current.content.terms.firstShareBps / PERCENT_BPS}% /{' '}
          {(BASIS_POINTS - current.content.terms.firstShareBps) / PERCENT_BPS}%
        </p>
      )}
      {terms.mode === 'EXCLUSIVE' && (
        <p>
          {uiText(locale, 'Налог взимает', 'Taxing state')}:{' '}
          {displayText(
            treaty.parties.find((party) => party.id === terms.taxingStateId)?.name ?? {},
            locale,
          )}
        </p>
      )}
      <details>
        <summary>{uiText(locale, 'Проверить точную редакцию', 'Verify exact revision')}</summary>{' '}
        <p>
          {uiText(locale, 'Редакция и хеш', 'Revision and hash')}: {current.id} ·{' '}
          {current.contentHash}
        </p>
      </details>
      {treaty.activeRevisionId !== null && treaty.activeRevisionId !== treaty.currentRevisionId && (
        <Alert>
          {uiText(
            locale,
            'Пока новая редакция не утверждена обеими сторонами, действует прежняя.',
            'The previous revision remains effective until both parties ratify the amendment.',
          )}
        </Alert>
      )}
      <ul>
        {treaty.parties.map((party) => (
          <li key={party.id}>
            {displayText(party.name, locale)}:{' '}
            {uiText(
              locale,
              treaty.decisions.some(
                (item) =>
                  item.stateId === party.id &&
                  item.revisionId === current.id &&
                  item.current &&
                  (item.kind === 'RATIFY_TREATY' || item.kind === 'AMEND_TREATY'),
              )
                ? 'Подтверждено действующими полномочиями'
                : 'Ожидает подтверждения',
              treaty.decisions.some(
                (item) =>
                  item.stateId === party.id &&
                  item.revisionId === current.id &&
                  item.current &&
                  (item.kind === 'RATIFY_TREATY' || item.kind === 'AMEND_TREATY'),
              )
                ? 'Current approval recorded'
                : 'Awaiting approval',
            )}
          </li>
        ))}
      </ul>
      <FieldHelp
        label={uiText(locale, 'Прекращение договора', 'Treaty termination')}
        content={uiText(
          locale,
          'В V1 прекращение двустороннее: каждая сторона принимает отдельное решение. Пока второй стороны нет, действующий договор сохраняется.',
          'V1 termination is bilateral: each state makes its own decision. The agreement remains effective until both approve.',
        )}
      />
      <div className={styles.actions}>
        {treaty.status === 'DRAFT' &&
          treaty.proposerStateId === state.id &&
          economicAuthority(state, actorId, ratifyKind) && (
            <Button onClick={submit} disabled={send.isPending}>
              {uiText(locale, 'Отправить партнёру', 'Send to partner')}
            </Button>
          )}
        {treaty.status === 'PROPOSED' && economicAuthority(state, actorId, ratifyKind) && (
          <Button value={ratifyKind} onClick={decision}>
            {uiText(locale, 'Утвердить своей стороной', 'Ratify for our state')}
          </Button>
        )}
        {treaty.status === 'PROPOSED' && economicAuthority(state, actorId, 'REJECT_TREATY') && (
          <Button value="REJECT_TREATY" tone="quiet" onClick={decision}>
            {uiText(locale, 'Отклонить', 'Reject')}
          </Button>
        )}
        {treaty.status !== 'TERMINATED' && economicAuthority(state, actorId, ratifyKind) && (
          <Button tone="quiet" onClick={edit}>
            {uiText(locale, 'Предложить новую редакцию', 'Propose a new revision')}
          </Button>
        )}
        {active !== undefined &&
          treaty.status !== 'TERMINATED' &&
          economicAuthority(state, actorId, 'DENOUNCE_TREATY') && (
            <Button tone="quiet" value="DENOUNCE_TREATY" onClick={decision}>
              {uiText(locale, 'Согласовать прекращение', 'Approve termination')}
            </Button>
          )}
      </div>
      {editing && (
        <TreatyWizard key={current.id} stateId={state.id} treaty={treaty} onSaved={onSaved} />
      )}
      <TreatyHistory stateId={state.id} treatyId={treaty.id} />
      {treaty.activeRevisionId !== null && (
        <a href={`/treaties/${treaty.id}`}>
          {uiText(locale, 'Публичный договор', 'Public treaty')}
        </a>
      )}
      {send.error !== null && <Alert tone="danger">{errorMessage(send.error)}</Alert>}
      <Dialog
        open={submission.review !== null}
        onOpenChange={handleChangeOpen}
        title={uiText(locale, 'Подтвердить государственное решение', 'Confirm state decision')}
      >
        <p>
          {displayText(
            (submission.review?.payload.kind === 'DENOUNCE_TREATY' ? active : current)?.content
              .name ?? {},
            locale,
          )}
        </p>
        <p>
          {uiText(
            locale,
            'Подтверждается точная редакция с хешем',
            'Approves the exact revision with hash',
          )}
          :{' '}
          {submission.review !== null && 'contentHash' in submission.review.payload
            ? submission.review.payload.contentHash
            : ''}
        </p>
        <Button onClick={handleConfirm} disabled={submission.pending}>
          {uiText(locale, 'Подтвердить государственное решение', 'Confirm state decision')}
        </Button>
        {submission.error !== null && <Alert tone="danger">{errorMessage(submission.error)}</Alert>}
      </Dialog>
    </article>
  );
}
export { TreatyCard };
