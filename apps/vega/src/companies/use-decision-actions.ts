import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  applyCompanyDecision,
  approveCompanyDecision,
  revokeCompanyDecisionApproval,
  cancelCompanyDecision,
} from '@helicraft/alhena';
import { browserClient } from '../account-api';

type CompanyDecisionCommand =
  | { type: 'APPROVE'; officeId: string }
  | { type: 'REVOKE'; approvalId: string }
  | { type: 'APPLY'; reason: string }
  | { type: 'CANCEL' };
function useCompanyDecisionActions(
  id: string,
  onSaved: () => void,
): UseMutationResult<void, Error, CompanyDecisionCommand> {
  return useMutation({
    mutationFn: async (command: CompanyDecisionCommand): Promise<void> => {
      const client = browserClient();
      if (command.type === 'APPROVE') {
        await approveCompanyDecision({
          client,
          path: { id },
          body: { officeId: command.officeId },
          throwOnError: true,
        });
        return;
      }
      if (command.type === 'REVOKE') {
        await revokeCompanyDecisionApproval({
          client,
          path: { id },
          body: { approvalId: command.approvalId },
          throwOnError: true,
        });
        return;
      }
      if (command.type === 'APPLY') {
        await applyCompanyDecision({
          client,
          path: { id },
          body: { reason: command.reason },
          throwOnError: true,
        });
        return;
      }
      await cancelCompanyDecision({ client, path: { id }, throwOnError: true });
    },
    onSuccess: onSaved,
  });
}
export { useCompanyDecisionActions };
