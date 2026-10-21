import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient, getPublishedCompanyIdentity } from '@helicraft/alhena';
import type { PublishedCompanyIdentity } from '@helicraft/alhena';

function useCompanySelection(initialId?: string): {
  company: PublishedCompanyIdentity | null;
  handleCompanyChange: (company: PublishedCompanyIdentity | null) => void;
  loading: boolean;
  error: boolean;
} {
  const [selected, setSelected] = useState<PublishedCompanyIdentity | null | undefined>();
  const initial = useQuery({
    queryKey: ['published-company-identity', initialId],
    enabled: initialId !== undefined && selected === undefined,
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      if (initialId === undefined) {
        throw new Error('Company identity missing');
      }
      const result = await getPublishedCompanyIdentity({
        client: createClient({ credentials: 'omit' }),
        path: { id: initialId },
        throwOnError: true,
      });
      return result.data;
    },
  });
  return {
    company: selected === undefined ? (initial.data ?? null) : selected,
    handleCompanyChange: setSelected,
    loading: initialId !== undefined && selected === undefined && initial.isPending,
    error: initial.isError && selected === undefined,
  };
}
export { useCompanySelection };
