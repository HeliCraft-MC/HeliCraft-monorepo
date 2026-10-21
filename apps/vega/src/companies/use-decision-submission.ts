import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createCompanyDecision } from '@helicraft/alhena';
import type { CompanyDecisionPayload, CompanyWorkspace, TaxCalculation } from '@helicraft/alhena';
import { browserClient } from '../account-api';

interface CompanyDecisionConfirmation {
  payload: CompanyDecisionPayload;
  revisionId: string;
  idempotencyKey: string;
  calculation?: TaxCalculation;
  expiresAt?: string;
}
// oxlint-disable-next-line max-lines-per-function -- One immutable confirmation binds the current charter, exact payload, quote and idempotency key to the existing decision service.
function useCompanyDecisionSubmission(
  workspace: CompanyWorkspace,
  onSaved: () => void,
): {
  review: CompanyDecisionConfirmation | null;
  propose: (
    payload: CompanyDecisionPayload,
    calculation?: TaxCalculation,
    expiresAt?: string,
  ) => void;
  confirm: () => void;
  changeOpen: (open: boolean) => void;
  pending: boolean;
  error: unknown;
  savedId: string | null;
} {
  const [review, setReview] = useState<CompanyDecisionConfirmation | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (input: CompanyDecisionConfirmation) => {
      const result = await createCompanyDecision({
        client: browserClient(),
        path: { id: workspace.id },
        body: {
          payload: input.payload,
          revisionId: input.revisionId,
          idempotencyKey: input.idempotencyKey,
        },
        throwOnError: true,
      });
      return result.data.id;
    },
    onSuccess: (id) => {
      setSavedId(id);
      setReview(null);
      onSaved();
    },
  });
  const { mutate, isPending } = mutation;
  const propose = useCallback(
    (payload: CompanyDecisionPayload, calculation?: TaxCalculation, expiresAt?: string): void => {
      setReview({
        payload: structuredClone(payload),
        revisionId: workspace.currentRevisionId,
        idempotencyKey: crypto.randomUUID(),
        expiresAt,
        calculation: calculation === undefined ? undefined : structuredClone(calculation),
      });
    },
    [workspace.currentRevisionId],
  );
  const confirm = useCallback((): void => {
    if (review !== null) {
      mutate(review);
    }
  }, [review, mutate]);
  const changeOpen = useCallback(
    (open: boolean): void => {
      if (!open && !isPending) {
        setReview(null);
      }
    },
    [isPending],
  );
  return {
    review,
    propose,
    confirm,
    changeOpen,
    pending: isPending,
    error: mutation.error,
    savedId,
  };
}
export { useCompanyDecisionSubmission, type CompanyDecisionConfirmation };
