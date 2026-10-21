import { useCallback, useId, useMemo, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyDecisionDetail } from '@helicraft/alhena';
import { Alert, Button, FormField, Textarea } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { errorMessage } from '../account-api';
import { useCompanyDecisionActions } from './use-decision-actions';

function CompanyDecisionControls({
  decision,
  actorId,
  onSaved,
}: Readonly<{
  decision: CompanyDecisionDetail;
  actorId: string;
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const [reason, setReason] = useState('');
  const mutation = useCompanyDecisionActions(decision.id, onSaved);
  const { mutate } = mutation;
  const scope = useMemo(() => ({ decision, mutate }), [decision, mutate]);
  const click = usePropCache<() => void>(scope);
  const explain = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    setReason(event.currentTarget.value);
  }, []);
  const apply = useCallback((): void => {
    mutate({ type: 'APPLY', reason });
  }, [mutate, reason]);
  const cancel = useCallback((): void => {
    mutate({ type: 'CANCEL' });
  }, [mutate]);
  return (
    <section>
      {decision.stale && (
        <Alert tone="info">
          {uiText(
            locale,
            'Условия или полномочия изменились. Создайте новое решение; старые подписи не переносятся.',
            'Terms or authority changed. Create a fresh decision; previous approvals cannot be transferred.',
          )}
        </Alert>
      )}
      {decision.executionProblem !== null && <Alert tone="info">{decision.executionProblem}</Alert>}
      {decision.approvableOfficeIds.map((officeId) => (
        <Button
          key={officeId}
          onClick={click(officeId, () => {
            mutate({ type: 'APPROVE', officeId });
          })}
          disabled={mutation.isPending}
        >
          {uiText(locale, 'Одобрить', 'Approve')} ·{' '}
          {displayText(
            decision.charter.offices.find((office) => office.id === officeId)?.name ?? {},
            locale,
          )}
        </Button>
      ))}
      {decision.approvals
        .filter(
          (approval) =>
            approval.actorId === actorId &&
            approval.revokedAt === null &&
            decision.status === 'PENDING',
        )
        .map((approval) => (
          <Button
            key={approval.id}
            onClick={click(approval.id, () => {
              mutate({ type: 'REVOKE', approvalId: approval.id });
            })}
            disabled={mutation.isPending}
          >
            {uiText(locale, 'Отозвать подпись', 'Revoke approval')} ·{' '}
            {displayText(
              decision.charter.offices.find((office) => office.id === approval.officeId)?.name ??
                {},
              locale,
            )}
          </Button>
        ))}
      {decision.manualRequired && (
        <>
          <p>
            {decision.manualProcedures
              .map((procedure) => displayText(procedure, locale))
              .join('\n')}
          </p>
          <FormField
            htmlFor={id}
            label={uiText(locale, 'Основание ручного исполнения', 'Manual execution reason')}
          >
            <Textarea id={id} value={reason} onChange={explain} maxLength={2000} />
          </FormField>
        </>
      )}
      {decision.status === 'PENDING' && (
        <Button
          onClick={apply}
          disabled={
            !decision.canApply ||
            mutation.isPending ||
            (decision.manualRequired && reason.trim() === '')
          }
        >
          {uiText(locale, 'Исполнить утверждённое решение', 'Execute approved decision')}
        </Button>
      )}
      {decision.canCancel && (
        <Button onClick={cancel} disabled={mutation.isPending}>
          {uiText(locale, 'Отменить предложение', 'Cancel proposal')}
        </Button>
      )}
      {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
    </section>
  );
}
export { CompanyDecisionControls };
