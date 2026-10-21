import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { consentToShareAcquisition, revokeShareAcquisitionConsent } from '@helicraft/alhena';
import type { ShareOperationView } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { operationRecipients } from './share-view-model';

type ConsentCommand = { type: 'GRANT'; idempotencyKey: string } | { type: 'REVOKE'; ids: string[] };
function PersonalShareConsent({
  view,
  actorId,
  onSaved,
}: Readonly<{ view: ShareOperationView; actorId: string; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const own = view.consents.filter(
    (consent) =>
      consent.owner.type === 'PLAYER' &&
      consent.owner.id === actorId &&
      consent.revokedAt === null &&
      consent.eventId === null,
  );
  const recipient = operationRecipients(view.operation).some(
    (owner) => owner.type === 'PLAYER' && owner.id === actorId,
  );
  const mutation = useMutation({
    mutationFn: async (command: ConsentCommand): Promise<void> => {
      if (command.type === 'GRANT') {
        await consentToShareAcquisition({
          client: browserClient(),
          body: {
            operationId: view.id,
            termsHash: view.termsHash,
            idempotencyKey: command.idempotencyKey,
          },
          throwOnError: true,
        });
        return;
      }
      await Promise.all(
        command.ids.map(async (id) => {
          await revokeShareAcquisitionConsent({
            client: browserClient(),
            path: { id },
            throwOnError: true,
          });
        }),
      );
    },
    onSettled: onSaved,
  });
  const { mutate } = mutation;
  const grant = useCallback((): void => {
    mutate({ type: 'GRANT', idempotencyKey: crypto.randomUUID() });
  }, [mutate]);
  const revoke = useCallback((): void => {
    mutate({ type: 'REVOKE', ids: own.map((consent) => consent.id) });
  }, [mutate, own]);
  return (
    <section>
      {recipient && view.eventId === null && (
        <Button
          onClick={grant}
          disabled={
            !view.termsCurrent ||
            mutation.isPending ||
            own.some((consent) => consent.status === 'AVAILABLE')
          }
        >
          {uiText(locale, 'Согласиться получить эти акции', 'Consent to receive these shares')}
        </Button>
      )}
      {own.length > 0 && (
        <Button onClick={revoke} disabled={mutation.isPending}>
          {uiText(
            locale,
            'Отозвать все мои согласия на эти условия',
            'Revoke all my consents to these terms',
          )}
        </Button>
      )}
      {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
    </section>
  );
}
export { PersonalShareConsent };
