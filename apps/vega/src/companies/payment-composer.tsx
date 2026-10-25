// oxlint-disable import/max-dependencies -- The financial composer freezes one tax quote and exact corporate debit before submitting through the existing company decision service.
import { useCallback, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createCompanyPaymentQuote } from '@helicraft/alhena';
import type { CompanyWallet, CompanyWorkspace, LegalOwner } from '@helicraft/alhena';
import { ActionPanel, Alert, Button } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { companyPayment } from './payment-model';
import { CompanyPaymentFields } from './payment-fields';
import { CompanyDecisionReview } from './decision-review';
import { useCompanyDecisionSubmission } from './use-decision-submission';

function CompanyPaymentComposer({
  workspace,
  wallet,
  onSaved,
}: Readonly<{
  workspace: CompanyWorkspace;
  wallet: CompanyWallet;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const [recipient, setRecipient] = useState<LegalOwner | null>(null);
  const [type, setType] = useState<LegalOwner['type']>('PLAYER');
  const submission = useCompanyDecisionSubmission(workspace, onSaved);
  const { propose } = submission;
  const preview = useMutation({
    mutationFn: async (form: FormData): Promise<void> => {
      const payment = companyPayment(form, recipient);
      if (
        !wallet.currencies.some(
          (currency) => currency.id === payment.currencyId && currency.status === 'ACTIVE',
        )
      ) {
        throw new Error(
          uiText(
            locale,
            'Выберите действующую валюту счёта.',
            'Choose an active account currency.',
          ),
        );
      }
      if (payment.recipient.type === 'STATE') {
        propose(payment);
        return;
      }
      const result = await createCompanyPaymentQuote({
        client: browserClient(),
        path: { id: workspace.id },
        body: { revisionId: workspace.currentRevisionId, payment },
        throwOnError: true,
      });
      propose(
        {
          ...payment,
          quoteId: result.data.id,
          approvedDebitMinor: result.data.calculation.totalDebitMinor,
        },
        result.data.calculation,
        result.data.expiresAt,
      );
    },
  });
  const { mutate } = preview;
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      mutate(new FormData(event.currentTarget));
    },
    [mutate],
  );
  const payload = submission.review?.payload;
  const code =
    payload?.kind === 'TRANSFER_FUNDS'
      ? (wallet.currencies.find((currency) => currency.id === payload.currencyId)?.code ?? '')
      : '';
  return (
    <ActionPanel title={uiText(locale, 'Новый платёж', 'New payment')}>
      <form onSubmit={submit}>
        <CompanyPaymentFields
          wallet={wallet}
          recipient={recipient}
          type={type}
          onType={setType}
          onRecipient={setRecipient}
        />
        <Button
          type="submit"
          disabled={preview.isPending || submission.pending || recipient === null}
        >
          {uiText(locale, 'Рассчитать и проверить платёж', 'Calculate and review payment')}
        </Button>
      </form>
      {preview.error !== null && <Alert tone="danger">{errorMessage(preview.error)}</Alert>}
      <CompanyDecisionReview workspace={workspace} submission={submission} code={code} />
    </ActionPanel>
  );
}
export { CompanyPaymentComposer };
