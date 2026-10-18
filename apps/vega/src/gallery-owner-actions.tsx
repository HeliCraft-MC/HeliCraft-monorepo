import { useTranslation } from './i18n';
import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Alert, Button } from '@helicraft/atria';
import { deleteGalleryImage } from '@helicraft/alhena';
import { browserClient, currentAccount, errorMessage } from './account-api';
import { useHydrated } from './use-hydrated';

function GalleryOwnerActions({
  id,
  ownerId,
}: Readonly<{ id: string; ownerId: string }>): ReactElement | null {
  const { text } = useTranslation();

  const hydrated = useHydrated();
  const account = useQuery({
    queryKey: ['account'],
    queryFn: currentAccount,
    enabled: hydrated,
    retry: false,
  });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const remove = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      await deleteGalleryImage({ client: browserClient(), path: { id }, throwOnError: true });
      globalThis.location.assign('/gallery');
    } catch (error) {
      setMessage(errorMessage(error));
      setBusy(false);
    }
  }, [id]);
  const handleRemove = useCallback((): void => {
    void remove();
  }, [remove]);
  const handleConfirm = useCallback((): void => {
    setConfirm(true);
  }, []);
  const handleCancel = useCallback((): void => {
    setConfirm(false);
  }, []);
  if (!hydrated || account.data?.id !== ownerId) {
    return null;
  }
  return (
    <div>
      {message !== null && <Alert tone="danger">{text(message)}</Alert>}
      {confirm ? (
        <>
          <p>{text('gallery.delete.confirm')}</p>
          <Button disabled={busy} onClick={handleRemove}>
            {text('gallery.delete.submit')}
          </Button>
          <Button tone="quiet" disabled={busy} onClick={handleCancel}>
            {text('common.cancel')}
          </Button>
        </>
      ) : (
        <Button tone="quiet" onClick={handleConfirm}>
          {text('gallery.delete.ownPhoto')}
        </Button>
      )}
    </div>
  );
}
export { GalleryOwnerActions };
