import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { prepareShareOperation } from '@helicraft/alhena';
import type { CompanyShareOperation } from '@helicraft/alhena';
import { browserClient } from '../account-api';

interface SharePreparation {
  operation: CompanyShareOperation;
  idempotencyKey: string;
}
interface SharePreparationController {
  review: SharePreparation | null;
  prepare: (operation: CompanyShareOperation) => void;
  confirm: () => void;
  changeOpen: (open: boolean) => void;
  pending: boolean;
  error: unknown;
  savedId: string | null;
}
function useSharePreparation(onSaved: () => void): SharePreparationController {
  const [review, setReview] = useState<SharePreparation | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (input: SharePreparation) => {
      const result = await prepareShareOperation({
        client: browserClient(),
        body: input,
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
  const prepare = useCallback((operation: CompanyShareOperation): void => {
    setReview({ operation: structuredClone(operation), idempotencyKey: crypto.randomUUID() });
  }, []);
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
    prepare,
    confirm,
    changeOpen,
    pending: isPending,
    error: mutation.error,
    savedId,
  };
}
export { useSharePreparation };
