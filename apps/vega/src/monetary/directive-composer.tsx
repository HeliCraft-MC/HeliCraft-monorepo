import { monetaryLabel } from './labels';
// oxlint-disable import/max-dependencies -- Form composition reuses localized input, player search, exact amount presentation and API mutation.
import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, SubmitEvent, ReactElement } from 'react';
import type { LocalizedInput, StateDetail, StateMonetary } from '@helicraft/alhena';
import { Button, Select, FormField, FieldHelp, Alert, Dialog } from '@helicraft/atria';
import { IdentityFields } from './identity-fields';
import type { SelectedPlayer } from '../player-picker';
import { errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { availableKinds, isDirectiveKind, hasLocalizedIdentity, hasFinancialFields } from './model';
import type { DirectiveKind } from './model';
import { composePayload } from './compose-payload';
import { PolicyFields } from './policy-fields';
import { FinancialFields } from './financial-fields';
import { useDirectiveSubmission } from './use-directive-submission';
import { DirectiveResult } from './directive-result';
import { PayloadSummary } from './payload-summary';
import styles from './monetary.module.scss';

function DirectiveComposer({
  state,
  actorId,
  monetary,
  onSaved,
  initialKind = 'ESTABLISH_BANK',
}: Readonly<{
  state: StateDetail;
  actorId: string;
  monetary: StateMonetary;
  onSaved: () => void;
  initialKind?: DirectiveKind;
}>): ReactElement {
  const { text } = useTranslation();
  const id = useId();
  const currencyId = monetary.currency?.id ?? null;
  const available = availableKinds(state, actorId, monetary);
  const [selected, setSelected] = useState<DirectiveKind>(initialKind);
  const kind = available.includes(selected) ? selected : (available[0] ?? 'ESTABLISH_BANK');
  const [name, setName] = useState<LocalizedInput>(() =>
    structuredClone(kind === 'CHANGE_CHARTER' ? (monetary.bank?.name ?? {}) : {}),
  );
  const [description, setDescription] = useState<LocalizedInput>(() =>
    structuredClone(kind === 'CHANGE_CHARTER' ? (monetary.bank?.description ?? {}) : {}),
  );
  const [players, setPlayers] = useState<SelectedPlayer[]>([]);
  const [problem, setProblem] = useState('');
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { review, setReview, savedId, confirm, changeOpen } = submission;
  const changeKind = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const { value } = event.currentTarget;
      if (isDirectiveKind(value)) {
        setSelected(value);
        setName(structuredClone(value === 'CHANGE_CHARTER' ? (monetary.bank?.name ?? {}) : {}));
        setDescription(
          structuredClone(value === 'CHANGE_CHARTER' ? (monetary.bank?.description ?? {}) : {}),
        );
        setProblem('');
      }
    },
    [monetary.bank, setName, setDescription],
  );
  // oxlint-disable-next-line react/preserve-manual-memoization -- The submit callback snapshots FormData and clones controlled content before confirmation; no live form value is mutated.
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      try {
        const payload = composePayload({
          kind,
          form: new FormData(event.currentTarget),
          name: structuredClone(name),
          description: structuredClone(description),
          currencyId,
          players: structuredClone(players),
        });
        setReview({ idempotencyKey: crypto.randomUUID(), payload });
        setProblem('');
      } catch {
        setProblem(`${text('monetary.invalidAmount')} ${text('monetary.invalidRecipient')}`);
      }
    },
    // oxlint-disable-next-line react/preserve-manual-memoization -- These exact controlled values determine the confirmation snapshot.
    [kind, name, description, currencyId, players, text, setReview],
  );
  if (available.length === 0) {
    return (
      <section className={styles.panel}>
        <DirectiveResult id={savedId} monetary={monetary} />
        <p>{text('monetary.noAvailableActions')}</p>
      </section>
    );
  }

  return (
    <section className={styles.card}>
      <h2>
        {text('monetary.newDirective')}{' '}
        <FieldHelp label={text('monetary.directives')} content={text('monetary.directiveHelp')} />
      </h2>
      <DirectiveResult id={savedId} monetary={monetary} />
      <form className={styles.form} onSubmit={submit}>
        <FormField
          label={text('monetary.action')}
          htmlFor={`${id}-kind`}
          help={text('monetary.authorityHelp')}
        >
          <Select id={`${id}-kind`} value={kind} onChange={changeKind}>
            {available.map((item) => (
              <option value={item} key={item}>
                {monetaryLabel(text, item)}
              </option>
            ))}
          </Select>
        </FormField>
        {hasLocalizedIdentity(kind) && (
          <IdentityFields
            name={name}
            description={description}
            onName={setName}
            onDescription={setDescription}
            currency={kind === 'CREATE_CURRENCY'}
            id={id}
          />
        )}
        {kind === 'CHANGE_POLICY' && <PolicyFields />}
        {hasFinancialFields(kind) && (
          <FinancialFields
            key={kind}
            kind={kind}
            players={players}
            onPlayers={setPlayers}
            currency={monetary.currency}
          />
        )}
        <Button type="submit">{text('monetary.submit')}</Button>
        {problem !== '' && <Alert tone="danger">{problem}</Alert>}
      </form>
      <Dialog
        open={review !== null}
        onOpenChange={changeOpen}
        title={text('monetary.confirm')}
        description={text('monetary.directiveHelp')}
        closeLabel={text('monetary.close')}
      >
        {review !== null && (
          <PayloadSummary payload={review.payload} code={monetary.currency?.code ?? ''} />
        )}
        <Button onClick={confirm} disabled={submission.pending}>
          {text('monetary.confirm')}
        </Button>
        {submission.error !== null && <Alert tone="danger">{errorMessage(submission.error)}</Alert>}
      </Dialog>
    </section>
  );
}
export { DirectiveComposer };
