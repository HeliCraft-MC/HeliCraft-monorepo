import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { previewStateConstitution } from '@helicraft/alhena';
import type { StateConfiguration } from '@helicraft/alhena';
import { browserClient } from '../account-api';
import type { Locale } from '../locales';

const PREVIEW_DELAY = 350;
function useConstitutionPreview(
  configuration: StateConfiguration,
  locale: Locale,
  enabled = true,
): {
  configuration: StateConfiguration;
  html: { id: string; html: string }[];
  warnings: string[];
  pending: boolean;
  error: Error | null;
} {
  const [snapshot, setSnapshot] = useState(configuration);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSnapshot(configuration);
    }, PREVIEW_DELAY);
    return (): void => {
      clearTimeout(timer);
    };
  }, [configuration]);
  const query = useQuery({
    queryKey: ['constitution-preview', snapshot, locale],
    enabled: enabled && snapshot.constitution !== null,
    queryFn: async ({ signal }) => {
      const result = await previewStateConstitution({
        client: browserClient(),
        body: { configuration: snapshot, locale },
        signal,
        throwOnError: true,
      });
      return result.data;
    },
    retry: false,
  });
  return {
    configuration: snapshot,
    html: query.data?.html ?? [],
    warnings: query.data?.warnings ?? [],
    pending: configuration !== snapshot || query.isPending,
    error: query.error,
  };
}
export { useConstitutionPreview };
