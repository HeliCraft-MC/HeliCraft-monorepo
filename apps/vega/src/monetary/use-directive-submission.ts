import { useStateRefresh } from '../states/use-state-refresh';
import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createMonetaryDirective } from '@helicraft/alhena';
import type { MonetaryDirectivePayload } from '@helicraft/alhena';
import { browserClient } from '../account-api';

interface DirectiveConfirmation {
  readonly idempotencyKey: string;
  readonly payload: MonetaryDirectivePayload;
}
interface DirectiveSubmission {
  review: DirectiveConfirmation | null;
  setReview: (value: DirectiveConfirmation | null) => void;
  savedId: string | null;
  pending: boolean;
  error: unknown;
  confirm: () => void;
  changeOpen: (open: boolean) => void;
}
function useDirectiveSubmission(stateId: string, onSaved: () => void): DirectiveSubmission {
  const refreshState = useStateRefresh(stateId, onSaved);
  const [review, setReview] = useState<DirectiveConfirmation | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      if (review === null) {
        return null;
      }
      const result = await createMonetaryDirective({
        client: browserClient(),
        path: { stateId },
        body: review,
        throwOnError: true,
      });
      return result.data.id;
    },
    onSuccess: async (id) => {
      setSavedId(id);
      setReview(null);
      await refreshState();
    },
  });
  const { mutate, isPending } = mutation;
  const confirm = useCallback((): void => {
    mutate();
  }, [mutate]);
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
    setReview,
    savedId,
    pending: isPending,
    error: mutation.error,
    confirm,
    changeOpen,
  };
}
export { useDirectiveSubmission };
