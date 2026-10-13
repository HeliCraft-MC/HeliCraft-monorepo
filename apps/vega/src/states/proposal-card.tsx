import type { ReactElement } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStateReformProposalById,
  getOwnedState,
  approveStateReformOffice,
} from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { StateReview } from './review';
import { ProposalApproveButton } from './proposal-approve-button';
import { uiText, label } from './text';
import styles from './states.module.scss';

function StateProposalCard({
  id,
  actorId,
}: Readonly<{ id: string; actorId: string }>): ReactElement {
  const { locale } = useTranslation();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['state-proposal', id, locale],
    queryFn: async () => {
      const proposal = await getStateReformProposalById({
        client: browserClient(),
        path: { id },
        query: { locale },
        throwOnError: true,
      });
      const state = await getOwnedState({
        client: browserClient(),
        path: { id: proposal.data.stateId },
        query: { locale },
        throwOnError: true,
      });
      return { proposal: proposal.data, state: state.data };
    },
  });
  const approval = useMutation({
    mutationFn: async (officeId: string) => {
      if (query.data === undefined) {
        return;
      }
      const { proposal } = query.data;
      await approveStateReformOffice({
        client: browserClient(),
        path: { id: proposal.draftId },
        body: { ownerId: proposal.ownerId, version: proposal.version, officeId },
        throwOnError: true,
      });
      await queryClient.invalidateQueries({ queryKey: ['state-proposal', id] });
    },
  });
  const { mutate: handleApprove } = approval;
  if (query.isPending) {
    return <p>{uiText(locale, 'Загрузка предложения…', 'Loading proposal…')}</p>;
  }
  if (query.isError) {
    return <Alert tone="danger">{errorMessage(query.error)}</Alert>;
  }
  const { proposal, state } = query.data;
  const policy = state.configuration.governance.policies.find(
    (item) => item.action === 'AMEND_GOVERNANCE',
  );
  const offices = state.configuration.governance.offices.filter(
    (office) =>
      policy?.officeIds.includes(office.id) === true &&
      state.holders.some((holder) => holder.officeId === office.id && holder.userId === actorId),
  );
  return (
    <section className={styles.card}>
      <h2>
        {uiText(locale, 'Предложение об устройстве государства', 'Governance proposal')} ·{' '}
        {proposal.version}
      </h2>
      <Alert>{label(`PROPOSAL_${proposal.status}`, locale)}</Alert>
      <StateReview
        configuration={proposal.configuration}
        founders={proposal.founders}
        html={proposal.html}
        flagUrl={`/api/v1/account/state-reform-proposals/${id}/flag`}
      />
      {proposal.status === 'PENDING' &&
        state.status === 'ACTIVE' &&
        offices.map((office) => (
          <ProposalApproveButton
            key={office.id}
            office={office}
            disabled={approval.isPending}
            onApprove={handleApprove}
          />
        ))}
      {approval.isSuccess && (
        <Alert>{uiText(locale, 'Одобрение записано', 'Approval recorded')}</Alert>
      )}
      {approval.error !== null && <Alert tone="danger">{errorMessage(approval.error)}</Alert>}
    </section>
  );
}
export { StateProposalCard };
