// oxlint-disable import/max-dependencies -- Economic decision review composes immutable treaty terms alongside existing monetary evidence and actions.
import { TreatyDecisionContent } from '../diplomacy/decision-content';
import { useCallback, useState } from 'react';
import type { ChangeEvent, MouseEvent, ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  revokeMonetaryApproval,
  approveMonetaryDirective,
  applyMonetaryDirective,
  cancelMonetaryDirective,
} from '@helicraft/alhena';
import type { MonetaryDirective, StateDetail } from '@helicraft/alhena';
import { Alert, Button, FormField, TextField } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText } from '../states/text';
import { DirectiveEvidence } from './directive-evidence';
import { PayloadSummary } from './payload-summary';
import styles from './monetary.module.scss';

function DirectiveCard({
  directive,
  state,
  actorId,
  code,
  onSaved,
}: Readonly<{
  directive: MonetaryDirective;
  state: StateDetail;
  actorId: string;
  code: string;
  onSaved: () => void;
}>): ReactElement {
  const { text, locale } = useTranslation();
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: async (action: string) => {
      const client = browserClient();
      if (action === 'apply') {
        await applyMonetaryDirective({
          client,
          path: { id: directive.id },
          body: reason.trim() === '' ? {} : { reason },
          throwOnError: true,
        });
      } else if (action === 'cancel') {
        await cancelMonetaryDirective({ client, path: { id: directive.id }, throwOnError: true });
      } else if (action.startsWith('revoke:')) {
        await revokeMonetaryApproval({
          client,
          path: { id: directive.id, officeId: action.slice('revoke:'.length) },
          throwOnError: true,
        });
      } else {
        await approveMonetaryDirective({
          client,
          path: { id: directive.id, officeId: action },
          throwOnError: true,
        });
      }
    },
    onSuccess: onSaved,
  });
  const { mutate } = mutation;
  const act = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      mutate(event.currentTarget.value);
    },
    [mutate],
  );
  const change = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setReason(event.currentTarget.value);
  }, []);
  const statuses = {
    APPLIED: text('monetary.applied'),
    CANCELLED: text('monetary.cancelled'),
    PENDING: text('monetary.pending'),
  };
  const status = statuses[directive.status];
  return (
    <article className={styles.card}>
      <PayloadSummary payload={directive.payload} code={code} />
      {directive.treatyContent !== null && (
        <TreatyDecisionContent content={directive.treatyContent} />
      )}
      <p>
        <strong>{status}</strong> ·{' '}
        <time dateTime={directive.createdAt}>
          {new Date(directive.createdAt).toLocaleString(locale)}
        </time>
      </p>
      <DirectiveEvidence directive={directive} state={state} />
      {directive.stale && directive.status === 'PENDING' && <Alert>{text('monetary.stale')}</Alert>}
      {directive.executionProblem !== null && (
        <Alert tone="danger">{directive.executionProblem}</Alert>
      )}
      {directive.votes.map((vote) => (
        <a key={vote.id} href={`/app/votings/${vote.id}`}>
          {text('monetary.vote')}
          {vote.approved ? ' ✓' : ''}
        </a>
      ))}
      {directive.manualRequired && (
        <>
          <p>
            {text('monetary.manual')}: {displayText(directive.manualProcedure, locale)}
          </p>
          <FormField label={text('monetary.reason')} htmlFor={`reason-${directive.id}`}>
            <TextField
              id={`reason-${directive.id}`}
              value={reason}
              onChange={change}
              maxLength={2000}
            />
          </FormField>
        </>
      )}

      <div className={styles.actions}>
        {directive.approvableOfficeIds.map((officeId) => (
          <Button key={officeId} value={officeId} onClick={act} disabled={mutation.isPending}>
            {text('monetary.approve')}:{' '}
            {displayText(
              state.configuration.governance.offices.find((office) => office.id === officeId)
                ?.name ?? {},
              locale,
            )}
          </Button>
        ))}
        {directive.status === 'PENDING' &&
          !directive.stale &&
          directive.approvals
            .filter((approval) => approval.actorId === actorId && approval.current)
            .map((approval) => (
              <Button
                tone="quiet"
                key={approval.officeId}
                value={`revoke:${approval.officeId}`}
                onClick={act}
                disabled={mutation.isPending}
              >
                {text('monetary.revokeApproval')}:{' '}
                {displayText(
                  state.configuration.governance.offices.find(
                    (office) => office.id === approval.officeId,
                  )?.name ?? {},
                  locale,
                )}
              </Button>
            ))}
        {directive.canApply && (
          <Button
            value="apply"
            onClick={act}
            disabled={mutation.isPending || (directive.manualRequired && reason.trim() === '')}
          >
            {text('monetary.execute')}
          </Button>
        )}
        {directive.status === 'PENDING' && directive.createdBy === actorId && (
          <Button tone="quiet" value="cancel" onClick={act} disabled={mutation.isPending}>
            {text('monetary.cancel')}
          </Button>
        )}
      </div>
      {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
    </article>
  );
}
export { DirectiveCard };
