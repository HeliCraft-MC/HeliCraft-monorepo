import { monetaryLabel } from './labels';
// oxlint-disable import/max-dependencies -- Form composition reuses localized input, player search, exact amount presentation and API mutation.
import { useCallback, useId, useState } from 'react';
import type { ChangeEvent, SubmitEvent, ReactElement } from 'react';
import type {
  PublishedCompanyIdentity,
  GovernancePolicy,
  LocalizedInput,
  StateDetail,
  StateMonetary,
} from '@helicraft/alhena';
import { Button, Select, FormField, FieldHelp, Alert } from '@helicraft/atria';
import { DirectiveIdentity } from './directive-identity';
import type { SelectedPlayer } from '../player-picker';
import { useTranslation } from '../i18n';
import { availableKinds, isDirectiveKind, hasFinancialFields } from './model';
import type { DirectiveKind } from './model';
import { composePayload, directiveCurrencyId } from './compose-payload';
import { PolicyFields } from './policy-fields';
import { FinancialFields } from './financial-fields';
import { useDirectiveSubmission } from './use-directive-submission';
import { DirectiveEmpty } from './directive-empty';
import { DirectiveResult } from './directive-result';
import { DirectiveReview } from './directive-review';
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
  const allowedCurrencyIds = monetary.currencies
    .filter((currency) => currency.status === 'ACTIVE')
    .map((currency) => currency.id)
    .join(',');
  const available = availableKinds(state, actorId, monetary);
  const [selected, setSelected] = useState<DirectiveKind>(initialKind);
  const kind = available.includes(selected) ? selected : (available[0] ?? 'ESTABLISH_BANK');
  const [name, setName] = useState<LocalizedInput>(() =>
    structuredClone(kind === 'CHANGE_CHARTER' ? (monetary.bank?.name ?? {}) : {}),
  );
  const [description, setDescription] = useState<LocalizedInput>(() =>
    structuredClone(kind === 'CHANGE_CHARTER' ? (monetary.bank?.description ?? {}) : {}),
  );
  const [initialPolicies, setInitialPolicies] = useState<GovernancePolicy[]>([]);
  const [company, setCompany] = useState<PublishedCompanyIdentity | null>(null);
  const [players, setPlayers] = useState<SelectedPlayer[]>([]);
  const [problem, setProblem] = useState('');
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { setReview, savedId } = submission;
  const changeKind = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const { value } = event.currentTarget;
      if (isDirectiveKind(value)) {
        setSelected(value);
        setCompany(null);
        setName(structuredClone(value === 'CHANGE_CHARTER' ? (monetary.bank?.name ?? {}) : {}));
        setDescription(
          structuredClone(value === 'CHANGE_CHARTER' ? (monetary.bank?.description ?? {}) : {}),
        );
        setProblem('');
      }
    },
    [monetary.bank, setName, setDescription, setCompany],
  );
  // oxlint-disable-next-line react/preserve-manual-memoization -- FormData and cloned controlled content intentionally freeze the submitted confirmation; the compiler cannot prove clone isolation.
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      try {
        const form = new FormData(event.currentTarget);
        const payload = composePayload({
          kind,
          form,
          name: structuredClone(name),
          description: structuredClone(description),
          currencyId: directiveCurrencyId({
            kind,
            form,
            nationalId: currencyId,
            allowedCurrencyIds: allowedCurrencyIds.split(','),
          }),
          players: structuredClone(players),
          company: company === null ? null : structuredClone(company),
          initialPolicies: structuredClone(initialPolicies),
        });
        setReview({ idempotencyKey: crypto.randomUUID(), payload });
        setProblem('');
      } catch {
        setProblem(`${text('monetary.invalidAmount')} ${text('monetary.invalidRecipient')}`);
      }
    },
    [
      // oxlint-disable-next-line react/preserve-manual-memoization -- The selected kind derives from live availability; submission clones its controlled values and retains no mutable form reference.
      kind,
      name,
      description,
      currencyId,
      allowedCurrencyIds,
      players,
      company,
      text,
      setReview,
      initialPolicies,
    ],
  );
  if (available.length === 0) {
    return <DirectiveEmpty id={savedId} monetary={monetary} />;
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
        <DirectiveIdentity
          kind={kind}
          id={id}
          name={name}
          description={description}
          onName={setName}
          onDescription={setDescription}
          state={state}
          initialPolicies={initialPolicies}
          onPolicies={setInitialPolicies}
        />
        {kind === 'CHANGE_POLICY' && <PolicyFields />}
        {hasFinancialFields(kind) && (
          <FinancialFields
            key={kind}
            kind={kind}
            players={players}
            onPlayers={setPlayers}
            company={company}
            onCompany={setCompany}
            currency={monetary.currency}
            currencies={monetary.currencies}
          />
        )}
        <Button type="submit">{text('monetary.submit')}</Button>
        {problem !== '' && <Alert tone="danger">{problem}</Alert>}
      </form>
      <DirectiveReview
        submission={submission}
        state={state}
        monetary={monetary}
        company={company}
      />
    </section>
  );
}
export { DirectiveComposer };
