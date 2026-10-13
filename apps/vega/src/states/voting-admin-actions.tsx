import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { publishVoting, cancelVoting } from '@helicraft/alhena';
import type { VotingDetail } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import styles from './states.module.scss';

function VotingAdminActions({
  id,
  status,
}: Readonly<{ id: string; status: VotingDetail['status'] }>): ReactElement {
  const { locale } = useTranslation();
  const queryClient = useQueryClient();
  const action = useMutation({
    mutationFn: async (publish: boolean) => {
      await (publish ? publishVoting : cancelVoting)({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      await queryClient.invalidateQueries({ queryKey: ['voting', id] });
    },
  });
  const { mutate } = action;
  const handlePublish = useCallback((): void => {
    mutate(true);
  }, [mutate]);
  const handleCancel = useCallback((): void => {
    mutate(false);
  }, [mutate]);
  return (
    <div className={styles.actions}>
      {status === 'DRAFT' && (
        <Button disabled={action.isPending} onClick={handlePublish}>
          {uiText(locale, 'Опубликовать голосование', 'Publish voting')}
        </Button>
      )}
      {status !== 'CLOSED' && status !== 'CANCELLED' && (
        <Button tone="quiet" disabled={action.isPending} onClick={handleCancel}>
          {uiText(locale, 'Отменить голосование', 'Cancel voting')}
        </Button>
      )}
      {action.error !== null && <Alert tone="danger">{errorMessage(action.error)}</Alert>}
    </div>
  );
}
export { VotingAdminActions };
