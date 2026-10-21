import { useCallback, useState } from 'react';
import type { ReactElement, SubmitEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { changeCompanyStatus } from '@helicraft/alhena';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { Alert, Button, Dialog, FormField, Textarea } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { companyStatusLabel } from './labels';

function AdminCompanyStatus({
  workspace,
  onSaved,
}: Readonly<{ workspace: CompanyWorkspace; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const [reason, setReason] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (input: string) => {
      if (workspace.status !== 'ACTIVE' && workspace.status !== 'SUSPENDED') {
        throw new Error('Company lifecycle unavailable');
      }
      await changeCompanyStatus({
        client: browserClient(),
        path: { id: workspace.id },
        body: {
          previousStatus: workspace.status,
          status: workspace.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
          reason: input,
        },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      setReason(null);
      onSaved();
    },
  });
  const { mutate, isPending } = mutation;
  const prepare = useCallback((event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = data.get('reason');
    setReason(typeof value === 'string' ? value.trim() : '');
  }, []);
  const confirm = useCallback((): void => {
    if (reason !== null) {
      mutate(reason);
    }
  }, [reason, mutate]);
  const changeOpen = useCallback(
    (open: boolean): void => {
      if (!open && !isPending) {
        setReason(null);
      }
    },
    [isPending],
  );
  const title =
    workspace.status === 'ACTIVE'
      ? uiText(locale, 'Приостановить компанию', 'Suspend company')
      : uiText(locale, 'Восстановить компанию', 'Restore company');
  return (
    <section>
      <h2>{title}</h2>
      <p>
        {uiText(
          locale,
          'Это административная модерация с обязательной причиной. Она сохраняет юридическую идентичность, акции, средства и историю. Регистрационные заявки рассматривает государство через Governance.',
          'This administrative moderation requires a reason. Legal identity, shares, funds and history are preserved. Registration applications are reviewed by the state through Governance.',
        )}
      </p>
      {['ACTIVE', 'SUSPENDED'].includes(workspace.status) && (
        <form onSubmit={prepare}>
          <FormField
            htmlFor="company-moderation-reason"
            label={uiText(locale, 'Причина', 'Reason')}
          >
            <Textarea id="company-moderation-reason" name="reason" required maxLength={2000} />
          </FormField>
          <Button type="submit" disabled={mutation.isPending}>
            {title}
          </Button>
        </form>
      )}
      <Dialog
        open={reason !== null}
        onOpenChange={changeOpen}
        title={title}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        <p>
          {displayText(workspace.content.name, locale)} ·{' '}
          {companyStatusLabel(workspace.status, locale)}
        </p>
        <p>{reason}</p>
        <Button onClick={confirm} disabled={mutation.isPending || reason === ''}>
          {uiText(locale, 'Подтвердить изменение статуса', 'Confirm status change')}
        </Button>
        {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
      </Dialog>
    </section>
  );
}
export { AdminCompanyStatus };
