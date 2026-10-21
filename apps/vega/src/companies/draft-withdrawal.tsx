import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { useMutation } from '@tanstack/react-query';
import { deleteCompanyDraft } from '@helicraft/alhena';
import type { CompanyDraft } from '@helicraft/alhena';
import { Alert, Button, Dialog } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function CompanyDraftWithdrawal({
  draft,
  onSaved,
}: Readonly<{ draft: CompanyDraft; onSaved: () => void }>): ReactElement {
  const { locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => {
      await deleteCompanyDraft({
        client: browserClient(),
        path: { id: draft.id },
        body: { version: draft.version },
        throwOnError: true,
      });
    },
    onSuccess: () => {
      setOpen(false);
      onSaved();
    },
  });
  const { mutate, isPending } = mutation;
  const start = useCallback((): void => {
    setOpen(true);
  }, []);
  const confirm = useCallback((): void => {
    mutate();
  }, [mutate]);
  const changeOpen = useCallback(
    (value: boolean): void => {
      if (!isPending) {
        setOpen(value);
      }
    },
    [isPending],
  );
  return (
    <>
      <Button tone="quiet" onClick={start}>
        {uiText(locale, 'Отозвать черновик', 'Withdraw draft')}
      </Button>
      <Dialog
        open={open}
        onOpenChange={changeOpen}
        title={uiText(locale, 'Отозвать проект учреждения', 'Withdraw formation draft')}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        <p>{displayText(draft.configuration.name, locale) || draft.title}</p>
        <p>
          {uiText(
            locale,
            'Проект станет недоступен для редактирования и регистрации. Его юридический идентификатор и история сохранятся. Это действие доступно только до подачи заявки.',
            'The draft will no longer be editable or available for registration. Its legal identifier and history are preserved. This action is available only before submission.',
          )}
        </p>
        <Button onClick={confirm} disabled={mutation.isPending}>
          {uiText(locale, 'Подтвердить отзыв', 'Confirm withdrawal')}
        </Button>
        {mutation.error !== null && <Alert tone="danger">{errorMessage(mutation.error)}</Alert>}
      </Dialog>
    </>
  );
}
export { CompanyDraftWithdrawal };
