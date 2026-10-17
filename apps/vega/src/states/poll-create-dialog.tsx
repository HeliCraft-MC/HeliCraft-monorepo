import { useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import { Button, Dialog } from '@helicraft/atria';
import { useQueryClient } from '@tanstack/react-query';
import { PollCreator } from './poll-creator';
import { useTranslation } from '../i18n';
import { uiText } from './text';

function PollCreateDialog(): ReactElement {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const show = useCallback((): void => {
    setOpen(true);
  }, []);
  const saved = useCallback((): void => {
    setOpen(false);
    void queryClient.invalidateQueries({ queryKey: ['votings'] });
  }, [queryClient]);
  const changeOpen = useCallback(
    (next: boolean): void => {
      setOpen(next);
      if (!next) {
        void queryClient.invalidateQueries({ queryKey: ['votings'] });
      }
    },
    [queryClient],
  );
  return (
    <>
      <Button onClick={show}>{uiText(locale, 'Создать опрос', 'Create poll')}</Button>
      <Dialog
        open={open}
        onOpenChange={changeOpen}
        size="fullscreen"
        title={uiText(locale, 'Новый опрос', 'New poll')}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        {open && <PollCreator onCreated={saved} />}
      </Dialog>
    </>
  );
}
export { PollCreateDialog };
