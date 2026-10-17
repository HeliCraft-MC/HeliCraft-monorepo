// oxlint-disable import/max-dependencies -- Bank review composes exact state/decision evidence, existing localization and administrative form controls.
import { monetaryLabel } from './labels';
import { formText } from './model';
import { useCallback, useId } from 'react';
import type { SubmitEvent, ReactElement } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  reviewCentralBank,
  reviewTaxOffice,
  getMonetaryDirective,
  getAdminState,
} from '@helicraft/alhena';
import type { CentralBank } from '@helicraft/alhena';
import { Alert, Button, FormField, Select, Textarea } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText } from '../states/text';
import { PayloadSummary } from './payload-summary';
import styles from './monetary.module.scss';

function BankReview({
  bank,
  onSaved,
  taxOffice = false,
}: Readonly<{ bank: CentralBank; onSaved: () => void; taxOffice?: boolean }>): ReactElement {
  const { text, locale } = useTranslation();
  const id = useId();
  const evidence = useQuery({
    queryKey: ['bank-application', bank.establishmentDirectiveId],
    queryFn: async () => {
      const decision = await getMonetaryDirective({
        client: browserClient(),
        path: { id: bank.establishmentDirectiveId },
        throwOnError: true,
      });
      const state = await getAdminState({
        client: browserClient(),
        path: { id: bank.stateId },
        query: { locale },
        throwOnError: true,
      });
      return { decision: decision.data, state: state.data };
    },
  });
  const mutation = useMutation({
    mutationFn: async (input: { status: CentralBank['status']; reason: string }) => {
      const review = taxOffice ? reviewTaxOffice : reviewCentralBank;
      await review({
        client: browserClient(),
        path: { id: bank.id },
        body: { ...input, directiveId: bank.establishmentDirectiveId },
        throwOnError: true,
      });
    },
    onSuccess: onSaved,
  });
  const { mutate } = mutation;
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const status = form.get('status');
      if (status === 'ACTIVE' || status === 'REJECTED' || status === 'SUSPENDED') {
        mutate({ status, reason: formText(form, 'reason') });
      }
    },
    [mutate],
  );
  return (
    <article className={styles.card}>
      <h2>{displayText(bank.name, locale)}</h2>
      <p>{displayText(bank.description, locale)}</p>
      <strong>{monetaryLabel(text, bank.status)}</strong>
      {evidence.data !== undefined && (
        <>
          <a href={`/admin/states/${bank.stateId}`}>
            {text('monetary.state')}: {displayText(evidence.data.state.configuration.name, locale)}{' '}
            · {monetaryLabel(text, evidence.data.state.status)}
          </a>
          <details>
            <summary>{text('monetary.establishment')}</summary>
            <PayloadSummary payload={evidence.data.decision.payload} code="" />
            <p>
              {text('monetary.governanceRevision')}: {evidence.data.decision.governanceRevisionId}
            </p>
            <p>{evidence.data.decision.payloadHash}</p>
            <p>
              {text('monetary.applied')}: {evidence.data.decision.appliedAt}
            </p>
          </details>
        </>
      )}
      {evidence.error !== null && <Alert tone="danger">{errorMessage(evidence.error)}</Alert>}
      {bank.status !== 'REJECTED' && (
        <form className={styles.form} onSubmit={submit}>
          <FormField label={text('monetary.status')} htmlFor={`${id}-status`}>
            <Select id={`${id}-status`} name="status" required defaultValue="">
              <option value="">{text('monetary.choose')}</option>
              {bank.status === 'PENDING' && (
                <>
                  <option value="ACTIVE">{text('monetary.statusActive')}</option>
                  <option value="REJECTED">{text('monetary.statusRejected')}</option>
                </>
              )}
              {bank.status === 'ACTIVE' && (
                <option value="SUSPENDED">{text('monetary.statusSuspended')}</option>
              )}
              {bank.status === 'SUSPENDED' && (
                <option value="ACTIVE">{text('monetary.statusActive')}</option>
              )}
            </Select>
          </FormField>
          <FormField label={text('monetary.reason')} htmlFor={`${id}-reason`}>
            <Textarea id={`${id}-reason`} name="reason" required maxLength={2000} />
          </FormField>
          <Button
            type="submit"
            disabled={mutation.isPending || evidence.data?.decision.status !== 'APPLIED'}
          >
            {text('monetary.review')}
          </Button>
        </form>
      )}
      {bank.reviews.map((review) => (
        <p key={review.id}>
          <time dateTime={review.createdAt}>
            {new Date(review.createdAt).toLocaleString(locale)}
          </time>{' '}
          · {monetaryLabel(text, review.status)} · {review.reason}
        </p>
      ))}
      {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
    </article>
  );
}
export { BankReview };
