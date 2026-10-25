// oxlint-disable import/max-dependencies -- State company composition keeps registration policy, protected applications, branch reviews and existing Governance approvals in separate product sections.
import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient, getPublishedCompanyRegistrationPolicy } from '@helicraft/alhena';
import type { StateDetail } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { economicAuthority } from '../taxation/model';
import { PolicyTerms } from './policy-terms';
import { CompanyPolicyComposer } from './policy-composer';
import { StateCompanyApplications } from './state-applications';
import { StateCompanyBranches } from './state-branches';
import { StateCompanyDecisions } from './state-decisions';
import { StateCompanyShareAction } from './state-share-action';
import { StateCompanyPortfolio } from './state-portfolio';
import { StateCompanyFoundingDecision } from './state-founding-decision';
import styles from './companies.module.scss';
import { StateEntityVoting } from './state-entity-voting';

function StateCompanyWorkspace({
  state,
  actorId,
  shareOperationId,
  formationDraftId,
  votingId,
}: Readonly<{
  state: StateDetail;
  actorId: string;
  shareOperationId?: string;
  formationDraftId?: string;
  votingId?: string;
}>): ReactElement {
  const { locale } = useTranslation();
  const queries = useQueryClient();
  const policy = useQuery({
    queryKey: ['company-registration-policy', state.id],
    queryFn: async () => {
      const result = await getPublishedCompanyRegistrationPolicy({
        client: createClient({ credentials: 'omit' }),
        path: { id: state.id },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const refresh = useCallback((): void => {
    void queries.invalidateQueries({ queryKey: ['state-company', state.id] });
    void queries.invalidateQueries({ queryKey: ['company-registration-policy', state.id] });
  }, [queries, state.id]);
  return (
    <section className={styles.stateWorkspace}>
      <StateEntityVoting state={state} actorId={actorId} votingId={votingId} onSaved={refresh} />
      <StateCompanyFoundingDecision
        state={state}
        actorId={actorId}
        draftId={formationDraftId}
        onSaved={refresh}
      />
      <StateCompanyShareAction
        state={state}
        actorId={actorId}
        operationId={shareOperationId}
        onSaved={refresh}
      />
      <h1>{uiText(locale, 'Компании и регистрация', 'Companies and registration')}</h1>
      <a href="/app/notifications">
        {uiText(locale, 'Все входящие согласования', 'All approval requests')}
      </a>
      <StateCompanyApplications state={state} actorId={actorId} onSaved={refresh} />
      <StateCompanyDecisions state={state} actorId={actorId} onSaved={refresh} />
      <details>
        <summary>
          {uiText(
            locale,
            'Правила регистрации и права учредителей',
            'Registration rules and founder permissions',
          )}
        </summary>
        <div className={styles.stateWorkspace}>
          {policy.isPending && (
            <p>{uiText(locale, 'Загрузка правил…', 'Loading registration policy…')}</p>
          )}
          {policy.data === null && (
            <Alert>
              {uiText(
                locale,
                'Правила ещё не утверждены. Регистрация компаний и филиалов недоступна до действительного решения Governance. Недостающее полномочие можно настроить через реформу государственного управления.',
                'No registration policy has been adopted. Company and branch registration remain unavailable until a valid Governance decision. Missing authority can be configured through a Governance reform.',
              )}
            </Alert>
          )}
          {policy.data !== null && policy.data !== undefined && (
            <PolicyTerms policy={policy.data.policy} />
          )}
          {policy.data !== undefined &&
            economicAuthority(state, actorId, 'SET_COMPANY_REGISTRATION_POLICY') && (
              <CompanyPolicyComposer
                key={policy.data?.id ?? 'initial-policy'}
                state={state}
                current={policy.data}
                onSaved={refresh}
              />
            )}
          {policy.error !== null && (
            <Alert tone="danger">
              {uiText(
                locale,
                'Не удалось загрузить правила регистрации.',
                'Could not load registration policy.',
              )}
            </Alert>
          )}
        </div>
      </details>
      <StateCompanyPortfolio state={state} actorId={actorId} />
      <StateCompanyBranches state={state} actorId={actorId} onSaved={refresh} />
    </section>
  );
}
export { StateCompanyWorkspace };
