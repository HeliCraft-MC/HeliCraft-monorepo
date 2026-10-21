// oxlint-disable import/max-dependencies -- The share action panel composes protected immutable terms, server-derived capabilities and the existing corporate decision workflow.
import { useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getShareOperation } from '@helicraft/alhena';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { ShareOperationSummary } from './share-operation-summary';
import { companyShareCommands } from './company-share-commands';
import { useCompanyDecisionSubmission } from './use-decision-submission';
import { CompanyDecisionReview } from './decision-review';

function CompanyShareAction({
  workspace,
  operationId,
  onSaved,
}: Readonly<{
  workspace: CompanyWorkspace;
  operationId?: string;
  onSaved: () => void;
}>): ReactElement | null {
  const { locale } = useTranslation();
  const query = useQuery({
    queryKey: ['company-share-operation', workspace.id, operationId],
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
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
    onSaved();
  }, [refetch, onSaved]);
  const submission = useCompanyDecisionSubmission(workspace, refresh);
  const { propose } = submission;
  const commands = useMemo(
    () => (query.data === undefined ? [] : companyShareCommands(workspace, query.data)),
    [workspace, query.data],
  );
  const scope = useMemo(() => ({ commands, propose }), [commands, propose]);
  const click = usePropCache<() => void>(scope);
  if (operationId === undefined) {
    return null;
  }
  const view = query.data;
  return (
    <section>
      <h3>{uiText(locale, 'Согласия и распоряжения акциями', 'Share consent and disposition')}</h3>
      {view !== undefined && (
        <>
          <ShareOperationSummary operation={view.operation} />
          {commands.map((command) => (
            <Button
              key={command.id}
              onClick={click(command.id, () => {
                propose(command.payload);
              })}
              disabled={command.disabled}
            >
              {uiText(locale, command.label[0], command.label[1])}
              {command.createdAt !== undefined && (
                <time dateTime={command.createdAt}>
                  {new Date(command.createdAt).toLocaleString(locale)}
                </time>
              )}
            </Button>
          ))}
          <a href={`/app/share-operations/${view.id}`}>
            {uiText(
              locale,
              'Все согласия и результат операции',
              'All consents and operation outcome',
            )}
          </a>
        </>
      )}
      {query.error !== null && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
      <CompanyDecisionReview workspace={workspace} submission={submission} />
    </section>
  );
}
export { CompanyShareAction };
