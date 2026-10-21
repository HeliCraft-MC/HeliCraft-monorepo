import { useCallback, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import type {
  StateDetail,
  PublishedCompanyRegistrationPolicy,
  NationalCurrency,
} from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { useDirectiveSubmission } from '../monetary/use-directive-submission';
import { CompanyPolicyFields } from './policy-fields';
import { StateCompanyReview } from './state-review';
import { registrationPolicyForm, UNCONFIGURED_COMPANY_POLICY } from './state-model';

function CompanyPolicyComposer({
  state,
  current,
  onSaved,
}: Readonly<{
  state: StateDetail;
  current: PublishedCompanyRegistrationPolicy | null;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const [currency, setCurrency] = useState<NationalCurrency | null>(null);
  const [problem, setProblem] = useState('');
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { setReview } = submission;
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      try {
        const policy = registrationPolicyForm(new FormData(event.currentTarget), currency);
        setReview({
          idempotencyKey: crypto.randomUUID(),
          payload: {
            kind: 'SET_COMPANY_REGISTRATION_POLICY',
            baseRevisionId: current?.id ?? null,
            policy,
          },
        });
        setProblem('');
      } catch {
        setProblem(
          uiText(
            locale,
            'Проверьте правила, валюту и точную сумму сбора.',
            'Check policy choices, fee currency and exact amount.',
          ),
        );
      }
    },
    [currency, setReview, current, locale],
  );
  return (
    <section>
      <h3>{uiText(locale, 'Подготовить правила регистрации', 'Prepare registration policy')}</h3>
      <form onSubmit={submit}>
        <CompanyPolicyFields
          initial={current?.policy ?? UNCONFIGURED_COMPANY_POLICY}
          currency={currency}
          onCurrency={setCurrency}
        />
        <Button type="submit" disabled={submission.pending}>
          {uiText(locale, 'Проверить правила регистрации', 'Review registration policy')}
        </Button>
      </form>
      {problem !== '' && <Alert tone="danger">{problem}</Alert>}
      <StateCompanyReview submission={submission} state={state} />
    </section>
  );
}
export { CompanyPolicyComposer };
