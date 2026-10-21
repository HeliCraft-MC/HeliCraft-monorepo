// oxlint-disable import/max-dependencies -- State share review composes actual legal-owner terms, current state policies and the existing immutable directive workflow.
import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getShareOperation } from '@helicraft/alhena';
import type { StateDetail } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { economicAuthority } from '../taxation/model';
import { useDirectiveSubmission } from '../monetary/use-directive-submission';
import { ShareOperationSummary } from './share-operation-summary';
import { operationRecipients, shareRecipientsConsented } from './share-view-model';
import { StateCompanyReview } from './state-review';

function StateCompanyShareAction({
  state,
  actorId,
  operationId,
  onSaved,
}: Readonly<{
  state: StateDetail;
  actorId: string;
  operationId?: string;
  onSaved: () => void;
}>): ReactElement | null {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['state-company', state.id, 'share-operation', actorId, operationId],
    enabled: operationId !== undefined,
    queryFn: async () => {
      if (operationId === undefined) {
        throw new Error('Share proposal missing');
      }
      const result = await getShareOperation({
        client: browserClient(),
        path: { id: operationId },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const submission = useDirectiveSubmission(state.id, onSaved);
  const { setReview } = submission;
  const scope = useMemo(() => ({ view: query.data, setReview }), [query.data, setReview]);
  const click = usePropCache<() => void>(scope);
  if (operationId === undefined) {
    return null;
  }
  const view = query.data;
  const receives =
    view !== undefined &&
    operationRecipients(view.operation).some(
      (owner) => owner.type === 'STATE' && owner.id === state.id,
    );
  return (
    <section>
      <h2>
        {uiText(locale, 'Государственная собственность: предложение', 'State ownership proposal')}
      </h2>
      {view !== undefined && (
        <>
          <ShareOperationSummary operation={view.operation} />
          {view.eventId === null && (
            <>
              {receives && economicAuthority(state, actorId, 'ACCEPT_SHARE_ACQUISITION') && (
                <Button
                  onClick={click('accept', () => {
                    setReview({
                      idempotencyKey: crypto.randomUUID(),
                      payload: { kind: 'ACCEPT_SHARE_ACQUISITION', operation: view.operation },
                    });
                  })}
                  disabled={!view.termsCurrent}
                >
                  {uiText(
                    locale,
                    'Проверить государственное приобретение',
                    'Review state share acquisition',
                  )}
                </Button>
              )}
              {view.operation.kind === 'TRANSFER' &&
                view.operation.owner.type === 'STATE' &&
                view.operation.owner.id === state.id &&
                economicAuthority(state, actorId, 'TRANSFER_COMPANY_SHARES') && (
                  <Button
                    onClick={click('transfer', () => {
                      if (view.operation.kind === 'TRANSFER') {
                        setReview({
                          idempotencyKey: crypto.randomUUID(),
                          payload: {
                            kind: 'TRANSFER_COMPANY_SHARES',
                            operation: view.operation,
                            authorizationDecisionId: view.issuerApprovalRequired
                              ? view.availableIssuerApprovalDecisionId
                              : null,
                          },
                        });
                      }
                    })}
                    disabled={
                      !view.termsCurrent ||
                      !shareRecipientsConsented(view) ||
                      (view.issuerApprovalRequired &&
                        view.availableIssuerApprovalDecisionId === null)
                    }
                  >
                    {uiText(
                      locale,
                      'Проверить государственную передачу доли',
                      'Review state share disposition',
                    )}
                  </Button>
                )}
              {economicAuthority(state, actorId, 'REVOKE_SHARE_ACQUISITION') &&
                view.consents
                  .filter(
                    (consent) =>
                      consent.owner.type === 'STATE' &&
                      consent.owner.id === state.id &&
                      consent.revokedAt === null &&
                      consent.eventId === null,
                  )
                  .map((consent) => (
                    <Button
                      key={consent.id}
                      onClick={click(consent.id, () => {
                        setReview({
                          idempotencyKey: crypto.randomUUID(),
                          payload: { kind: 'REVOKE_SHARE_ACQUISITION', consentId: consent.id },
                        });
                      })}
                    >
                      {uiText(
                        locale,
                        'Проверить отзыв государственного согласия',
                        'Review state consent revocation',
                      )}
                    </Button>
                  ))}
            </>
          )}
          <a href={`/app/share-operations/${view.id}`}>
            {uiText(locale, 'Все согласия и результат', 'All consents and outcome')}
          </a>
        </>
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      <StateCompanyReview state={state} submission={submission} />
    </section>
  );
}
export { StateCompanyShareAction };
