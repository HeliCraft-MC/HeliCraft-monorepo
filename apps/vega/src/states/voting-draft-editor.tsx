import { useState, useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import type { VotingInput } from '@helicraft/alhena';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Dialog } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import { PollCreator } from './poll-creator';

function VotingDraftEditor({
  id,
  input,
}: Readonly<{ id: string; input: VotingInput }>): ReactElement {
  const { locale } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const draft = useMemo(() => ({ id, input }), [id, input]);
  const show = useCallback((): void => {
    setOpen(true);
  }, []);
  const saved = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: ['voting', id] });
    setOpen(false);
  }, [queryClient, id]);
  return (
    <>
      <Button tone="quiet" onClick={show}>
        {uiText(locale, 'Редактировать черновик', 'Edit draft')}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        size="fullscreen"
        title={uiText(locale, 'Черновик опроса', 'Poll draft')}
        description={uiText(
          locale,
          'Измените вопросы и настройки, затем сохраните. Опубликованные голосования сохраняют свои вопросы и правила.',
          'Edit questions and settings, then save. Published votes retain their questions and rules.',
        )}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        {open && <PollCreator key={id} draft={draft} onCreated={saved} />}
      </Dialog>
    </>
  );
}
export { VotingDraftEditor };
