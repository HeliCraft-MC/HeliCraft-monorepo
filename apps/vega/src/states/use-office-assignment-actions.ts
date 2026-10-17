import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import {
  approveOfficeAssignment,
  applyOfficeAssignment,
  cancelOfficeAssignment,
} from '@helicraft/alhena';
import { browserClient } from '../account-api';

type AssignmentAction =
  | { type: 'APPROVE'; officeId: string }
  | { type: 'APPLY' }
  | { type: 'CANCEL' };
function useOfficeAssignmentActions(
  id: string,
  stateId: string,
  reason: string,
): UseMutationResult<string, unknown, AssignmentAction> {
  const queryClient = useQueryClient();
  return useMutation<string, unknown, AssignmentAction>({
    mutationFn: async (action) => {
      if (action.type === 'APPROVE') {
        await approveOfficeAssignment({
          client: browserClient(),
          path: { id, officeId: action.officeId },
          throwOnError: true,
        });
      }
      if (action.type === 'APPLY') {
        await applyOfficeAssignment({
          client: browserClient(),
          path: { id },
          body: { reason },
          throwOnError: true,
        });
      }
      if (action.type === 'CANCEL') {
        await cancelOfficeAssignment({ client: browserClient(), path: { id }, throwOnError: true });
      }
      await queryClient.invalidateQueries({ queryKey: ['office-assignment', id] });
      await queryClient.invalidateQueries({ queryKey: ['owned-state', stateId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-state', stateId] });
      return id;
    },
  });
}
export { useOfficeAssignmentActions };
