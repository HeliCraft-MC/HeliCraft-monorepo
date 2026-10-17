import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { useQuery } from '@tanstack/react-query';
import { ActionLink } from '@helicraft/atria';
import { currentAccount } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from './text';

function StateManagementLink({ state }: Readonly<{ state: StateDetail }>): ReactElement | null {
  const { locale } = useTranslation();
  const account = useQuery({
    queryKey: ['account'],
    queryFn: currentAccount,
    enabled: globalThis.document !== undefined,
  });
  if (!state.citizens.some((citizen) => citizen.id === account.data?.id)) {
    return null;
  }
  return (
    <ActionLink href={`/app/states/${state.id}/manage`}>
      {uiText(locale, 'Панель государства', 'State management')}
    </ActionLink>
  );
}
export { StateManagementLink };
