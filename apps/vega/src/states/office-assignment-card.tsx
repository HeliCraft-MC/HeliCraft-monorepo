// oxlint-disable import/max-dependencies -- State workspace composition combines typed decision evidence, citizen actions and shared controls.
import { useState, useCallback, useMemo, useId } from 'react';
import type { ChangeEvent, ComponentProps, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOfficeAssignment } from '@helicraft/alhena';
import { Alert, Button, FormField, Textarea } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from './text';
import { OfficeAssignmentApprovals } from './office-assignment-approvals';
import { OfficeAssignmentPayload } from './office-assignment-payload';
import { useOfficeAssignmentActions } from './use-office-assignment-actions';
import { usePropCache, rowKey } from './use-prop-cache';
import { VotingCard } from './voting-card';
import styles from './states.module.scss';

const REFRESH_MS = 15_000;
function OfficeAssignmentCard({
  id,
  stateId,
}: Readonly<{ id: string; stateId: string }>): ReactElement {
  const { locale } = useTranslation();
  const fieldId = useId();
  const [reason, setReason] = useState('');
  const query = useQuery({
    queryKey: ['office-assignment', id],
    queryFn: async () => {
      const result = await getOfficeAssignment({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      return result.data;
    },
    refetchInterval: REFRESH_MS,
  });
  const action = useOfficeAssignmentActions(id, stateId, reason);
  const scope = useMemo(() => [query.data, action.mutate], [query.data, action.mutate]);
  const click = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  const reasonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    setReason(event.currentTarget.value);
  }, []);
  if (query.isPending) {
    return <output>{uiText(locale, 'Загрузка предложения…', 'Loading proposal…')}</output>;
  }
  if (query.isError) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  const proposal = query.data;
  return (
    <article className={styles.card}>
      <OfficeAssignmentPayload proposal={proposal} />
      <p>
        {uiText(
          locale,
          proposal.status === 'APPLIED' ? 'Решение выполнено' : 'Предложение о должности',
          proposal.status === 'APPLIED' ? 'Decision applied' : 'Office proposal',
        )}{' '}
        ·{' '}
        <time dateTime={proposal.createdAt}>
          {new Date(proposal.createdAt).toLocaleString(locale)}
        </time>
      </p>
      {proposal.status === 'CANCELLED' && (
        <Alert>{uiText(locale, 'Предложение отменено', 'Proposal cancelled')}</Alert>
      )}
      {proposal.approvalGroups.length > 0 && <OfficeAssignmentApprovals proposal={proposal} />}
      <div className={styles.actions}>
        {proposal.approvalOffices
          .filter((office) => office.canApprove)
          .map((office) => (
            <Button
              key={office.id}
              tone="quiet"
              disabled={action.isPending}
              onClick={click(rowKey('approve', office.id), () => {
                action.mutate({ type: 'APPROVE', officeId: office.id });
              })}
            >
              {uiText(locale, 'Одобрить от должности', 'Approve as')}{' '}
              {displayText(office.name, locale)}
            </Button>
          ))}
      </div>
      {proposal.status !== 'CANCELLED' && proposal.votes.length > 0 && (
        <details>
          <summary>{uiText(locale, 'Голосования по предложению', 'Proposal votes')}</summary>
          {proposal.votes.map((vote) => (
            <VotingCard key={vote.id} id={vote.id} admin={false} />
          ))}
        </details>
      )}
      {proposal.manualRequired && proposal.canApply && (
        <FormField
          htmlFor={fieldId}
          label={uiText(locale, 'Причина ручного решения', 'Manual decision reason')}
        >
          <Textarea id={fieldId} value={reason} onChange={reasonChange} rows={3} />
        </FormField>
      )}
      <div className={styles.actions}>
        {proposal.status === 'PENDING' && (
          <Button
            disabled={
              action.isPending ||
              !proposal.canApply ||
              (proposal.manualRequired && reason.trim() === '')
            }
            onClick={click('apply', () => {
              action.mutate({ type: 'APPLY' });
            })}
          >
            {uiText(locale, 'Выполнить решение', 'Apply decision')}
          </Button>
        )}
        {proposal.canCancel && (
          <Button
            tone="quiet"
            disabled={action.isPending}
            onClick={click('cancel', () => {
              action.mutate({ type: 'CANCEL' });
            })}
          >
            {uiText(locale, 'Отменить предложение', 'Cancel proposal')}
          </Button>
        )}
      </div>
      {action.error !== null && <Alert tone="danger">{errorMessage(action.error)}</Alert>}
    </article>
  );
}
export { OfficeAssignmentCard };
