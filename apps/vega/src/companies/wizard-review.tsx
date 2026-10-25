import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { reviewCompanyRegistration, submitCompanyRegistration } from '@helicraft/alhena';
import type { CompanyDraft, CompanyRegistrationReview } from '@helicraft/alhena';
import { Alert, Button, Dialog } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyFormationSummary } from './formation-summary';
import { CompanyFormationConsents } from './formation-consents';
import { PolicyTerms } from './policy-terms';

interface PreparedFormation {
  draft: CompanyDraft;
  review: CompanyRegistrationReview;
  key: string;
}
function CompanyWizardReview({
  actorId,
  flush,
}: Readonly<{ actorId: string; flush: () => Promise<CompanyDraft> }>): ReactElement {
  const { locale } = useTranslation();
  const [saved, setSaved] = useState<CompanyDraft | null>(null);
  const [confirmation, setConfirmation] = useState<PreparedFormation | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const preview = useMutation({
    mutationFn: async () => {
      const draft = await flush();
      setSaved(draft);
      const result = await reviewCompanyRegistration({
        client: browserClient(),
        path: { id: draft.id },
        throwOnError: true,
      });
      return { draft, review: result.data, key: crypto.randomUUID() };
    },
  });
  const submit = useMutation({
    mutationFn: async (prepared: PreparedFormation) => {
      const result = await submitCompanyRegistration({
        client: browserClient(),
        path: { id: prepared.draft.id },
        body: {
          version: prepared.review.version,
          formationHash: prepared.review.formationHash,
          policyRevisionId: prepared.review.policyRevisionId,
          idempotencyKey: prepared.key,
        },
        throwOnError: true,
      });
      return result.data.id;
    },
    onSuccess: (id) => {
      setApplicationId(id);
      setConfirmation(null);
    },
  });
  const { mutate: check } = preview;
  const { mutate: apply } = submit;
  useEffect(() => {
    check();
  }, [check]);
  const review = useCallback((): void => {
    check();
  }, [check]);
  const confirm = useCallback((): void => {
    if (preview.data?.review.ready === true) {
      setConfirmation(preview.data);
    }
  }, [preview.data]);
  const execute = useCallback((): void => {
    if (confirmation !== null) {
      apply(confirmation);
    }
  }, [confirmation, apply]);
  const changeOpen = useCallback(
    (open: boolean): void => {
      if (!open && !submit.isPending) {
        setConfirmation(null);
      }
    },
    [submit.isPending],
  );
  return (
    <section>
      <Button onClick={review} disabled={preview.isPending || applicationId !== null}>
        {uiText(locale, 'Сохранить и проверить регистрацию', 'Save and review registration')}
      </Button>
      {saved !== null && (
        <>
          <CompanyFormationSummary
            configuration={saved.configuration}
            companyId={saved.companyId}
          />
          <CompanyFormationConsents draft={saved} actorId={actorId} />
        </>
      )}
      {preview.data !== undefined && (
        <>
          <PolicyTerms policy={preview.data.review.policy} />
          {preview.data.review.problem !== null && (
            <Alert tone="info">{preview.data.review.problem}</Alert>
          )}
          <p>
            {uiText(
              locale,
              'После получения согласий повторите проверку.',
              'Review again after participants have consented.',
            )}
          </p>
          <Button onClick={confirm} disabled={!preview.data.review.ready || applicationId !== null}>
            {uiText(locale, 'Подать заявку', 'Submit registration')}
          </Button>
        </>
      )}
      {preview.error !== null && <Alert tone="danger">{errorMessage(preview.error)}</Alert>}
      <Dialog
        open={confirmation !== null}
        onOpenChange={changeOpen}
        title={uiText(locale, 'Подтвердите учреждение', 'Confirm company formation')}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        {confirmation !== null && (
          <>
            <CompanyFormationSummary
              configuration={confirmation.draft.configuration}
              companyId={confirmation.draft.companyId}
            />
            <PolicyTerms policy={confirmation.review.policy} />
            <p>
              {uiText(
                locale,
                'Сбор будет списан с личного счёта заявителя при подаче. Заявка зафиксирует эти условия; последующие изменения правил требуют новой проверки.',
                'Any fee is debited from the applicant’s personal account on submission. The application freezes these terms; later policy changes require a fresh review.',
              )}
            </p>
          </>
        )}
        <Button onClick={execute} disabled={submit.isPending}>
          {uiText(locale, 'Подтвердить и подать', 'Confirm and submit')}
        </Button>
        {submit.error !== null && <Alert tone="danger">{errorMessage(submit.error)}</Alert>}
      </Dialog>
      {applicationId !== null && (
        <Alert tone="success">
          <a href={`/app/companies/applications/${applicationId}`}>
            {uiText(
              locale,
              'Заявка подана. Открыть результат',
              'Registration submitted. View outcome',
            )}
          </a>
        </Alert>
      )}
    </section>
  );
}
export { CompanyWizardReview };
