import { institutionGroup } from '../states/policy-groups';
import { InstitutionPolicyEditor } from '../states/institution-policy-editor';
// oxlint-disable import/max-dependencies -- The form reuses shared localized input, confirmation and Governance submission.
import { useCallback, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import type {
  GovernancePolicy,
  LocalizedInput,
  StateDetail,
  TaxLawRevision,
} from '@helicraft/alhena';
import { Alert, Button, Dialog, FormField, TextField } from '@helicraft/atria';
import { LocalizedInputField } from '../localized-input';
import { errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { useDirectiveSubmission } from '../monetary/use-directive-submission';
import { PayloadSummary } from '../monetary/payload-summary';
import { TaxLawFields } from './law-fields';
import { economicLabels, economicAuthority } from './model';
import styles from '../monetary/monetary.module.scss';

import { composeTaxPayload } from './compose';
import type { TaxKind } from './compose';
import { TaxExample } from './example';

function TaxEditor({
  state,
  actorId,
  kind,
  revision,
  onSaved,
}: Readonly<{
  state: StateDetail;
  actorId: string;
  kind: TaxKind;
  revision?: TaxLawRevision;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const [name, setName] = useState<LocalizedInput>(revision?.name ?? {});
  const [description, setDescription] = useState<LocalizedInput>(revision?.description ?? {});
  const [document, setDocument] = useState<LocalizedInput>(revision?.document ?? {});
  const [initialPolicies, setInitialPolicies] = useState<GovernancePolicy[]>([]);
  const [problem, setProblem] = useState('');
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { setReview, confirm: handleConfirm, changeOpen: handleChangeOpen } = submission;
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        const payload = composeTaxPayload({
          kind,
          form,
          name,
          description,
          document,
          revision,
          initialPolicies,
        });
        setReview({ idempotencyKey: crypto.randomUUID(), payload });
        setProblem('');
      } catch {
        setProblem(uiText(locale, 'Проверьте поля закона и дату.', 'Check law fields and date.'));
      }
    },
    [kind, revision, name, description, document, setReview, locale, initialPolicies],
  );
  if (!economicAuthority(state, actorId, kind)) {
    return (
      <p>
        {uiText(
          locale,
          'Нет полномочия для этого решения. Настройте процедуру через изменение государственного устройства.',
          'No authority for this decision. Configure its policy through a Governance reform.',
        )}
      </p>
    );
  }
  const label = economicLabels[kind];
  return (
    <section className={styles.card}>
      <h2>{uiText(locale, label?.[0] ?? kind, label?.[1] ?? kind)}</h2>
      <form className={styles.form} onSubmit={submit}>
        {kind !== 'REPEAL_TAX_LAW' && (
          <>
            <LocalizedInputField
              label={uiText(locale, 'Название', 'Name')}
              value={name}
              onChange={setName}
            />
            <LocalizedInputField
              label={uiText(locale, 'Описание', 'Description')}
              multiline
              value={description}
              onChange={setDescription}
            />
          </>
        )}
        <InstitutionPolicyEditor
          state={state}
          group={institutionGroup(kind)}
          value={initialPolicies}
          onChange={setInitialPolicies}
        />
        {(kind === 'ENACT_TAX_LAW' || kind === 'AMEND_TAX_LAW') && (
          <>
            <TaxLawFields revision={revision} stateId={state.id} />
            <LocalizedInputField
              label={uiText(locale, 'Текст закона (Markdown)', 'Law document (Markdown)')}
              multiline
              value={document}
              onChange={setDocument}
            />
            <TaxExample />
          </>
        )}
        {kind === 'REPEAL_TAX_LAW' && (
          <FormField label={uiText(locale, 'Дата отмены', 'Repeal date')} htmlFor="tax-repeal">
            <TextField id="tax-repeal" name="repealAt" type="datetime-local" required />
          </FormField>
        )}
        <Button type="submit">
          {uiText(locale, 'Подать на утверждение', 'Submit for approval')}
        </Button>
        {problem !== '' && <Alert tone="danger">{problem}</Alert>}
      </form>
      {submission.savedId !== null && (
        <Alert tone="success">
          {uiText(locale, 'Решение сохранено', 'Decision saved')}: {submission.savedId}
        </Alert>
      )}
      <Dialog
        open={submission.review !== null}
        onOpenChange={handleChangeOpen}
        title={uiText(locale, 'Подтвердить решение', 'Confirm decision')}
      >
        {submission.review !== null && (
          <PayloadSummary
            configuration={state.configuration}
            payload={submission.review.payload}
            code=""
          />
        )}
        <Button onClick={handleConfirm} disabled={submission.pending}>
          {uiText(locale, 'Подтвердить решение', 'Confirm decision')}
        </Button>
        {submission.error !== null && <Alert tone="danger">{errorMessage(submission.error)}</Alert>}
      </Dialog>
    </section>
  );
}
export { TaxEditor };
