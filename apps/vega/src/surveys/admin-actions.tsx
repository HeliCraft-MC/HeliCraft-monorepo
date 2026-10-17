import { useState, useMemo, useCallback } from 'react';
import type { ChangeEvent, ComponentProps, ReactElement } from 'react';
import type { VotingDetail } from '@helicraft/alhena';
import { closeSurvey, reopenSurvey, archiveSurvey, createVoting } from '@helicraft/alhena';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Dialog, FormField, TextField } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { localDateTime, isoDateTime } from '../states/time';
import styles from './survey.module.scss';

const descriptions = {
  close: [
    'Приём ответов остановится. Анкету можно будет переоткрыть.',
    'Response collection will stop. You can reopen the survey later.',
  ],
  reopen: [
    'Укажите новый срок. Уже принятые ответы и состав участников сохранятся.',
    'Choose a new deadline. Existing responses and eligibility are retained.',
  ],
  archive: [
    'Анкета исчезнет из списка участников. Ответы сохранятся для администратора.',
    'The survey will be hidden from participants. Administrators retain access to responses.',
  ],
} as const;
const DAY_MS = 86_400_000;
function SurveyAdminActions({ voting }: Readonly<{ voting: VotingDetail }>): ReactElement {
  const { locale } = useTranslation();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<'close' | 'archive' | 'reopen' | null>(null);
  const [closesAt, setClosesAt] = useState(() => new Date(Date.now() + DAY_MS).toISOString());
  const action = useMutation({
    mutationFn: async (kind: 'close' | 'archive' | 'reopen' | 'copy') => {
      if (kind === 'copy') {
        await createVoting({
          client: browserClient(),
          body: {
            ...voting.input,
            opensAt: new Date().toISOString(),
            closesAt: new Date(Date.now() + DAY_MS).toISOString(),
          },
          throwOnError: true,
        });
      } else {
        const execute = { close: closeSurvey, reopen: reopenSurvey, archive: archiveSurvey }[kind];
        await execute({
          client: browserClient(),
          path: { id: voting.id },
          body: { closesAt },
          throwOnError: true,
        });
      }
      setConfirm(null);
      await queryClient.invalidateQueries({ queryKey: ['voting', voting.id] });
      await queryClient.invalidateQueries({ queryKey: ['votings'] });
    },
  });
  const scope = useMemo(() => [action.mutate, confirm], [action.mutate, confirm]);
  const click = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  const changeEnd = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setClosesAt(isoDateTime(event.currentTarget.value));
  }, []);
  const closeDialog = useCallback((open: boolean): void => {
    if (!open) {
      setConfirm(null);
    }
  }, []);
  return (
    <div className={styles.toolbar}>
      {['OPEN', 'SCHEDULED'].includes(voting.status) && (
        <Button
          tone="quiet"
          onClick={click('close', () => {
            setConfirm('close');
          })}
        >
          {uiText(locale, 'Закрыть анкету', 'Close survey')}
        </Button>
      )}
      {voting.status === 'CLOSED' && (
        <Button
          onClick={click('reopen', () => {
            setConfirm('reopen');
          })}
        >
          {uiText(locale, 'Переоткрыть анкету', 'Reopen survey')}
        </Button>
      )}
      {voting.status !== 'ARCHIVED' && (
        <Button
          tone="quiet"
          onClick={click('archive', () => {
            setConfirm('archive');
          })}
        >
          {uiText(locale, 'В архив', 'Archive')}
        </Button>
      )}
      <Button
        tone="quiet"
        disabled={action.isPending}
        onClick={click('copy', () => {
          action.mutate('copy');
        })}
      >
        {uiText(locale, 'Копировать в новый черновик', 'Copy to new draft')}
      </Button>
      <Dialog
        open={confirm !== null}
        onOpenChange={closeDialog}
        title={uiText(locale, 'Управление анкетой', 'Manage survey')}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        <p>
          {uiText(locale, descriptions[confirm ?? 'close'][0], descriptions[confirm ?? 'close'][1])}
        </p>
        {confirm === 'reopen' && voting.input.survey?.manualClose !== true && (
          <FormField
            htmlFor={`${voting.id}-reopen`}
            label={uiText(locale, 'Новый срок завершения', 'New closing time')}
          >
            <TextField
              id={`${voting.id}-reopen`}
              type="datetime-local"
              value={localDateTime(closesAt)}
              onChange={changeEnd}
            />
          </FormField>
        )}
        <Button
          disabled={action.isPending}
          onClick={click('confirm', () => {
            if (confirm) {
              action.mutate(confirm);
            }
          })}
        >
          {uiText(locale, 'Подтвердить', 'Confirm')}
        </Button>
        {action.isError && <Alert tone="danger">{errorMessage(action.error)}</Alert>}
      </Dialog>
      {action.isError && confirm === null && (
        <Alert tone="danger">{errorMessage(action.error)}</Alert>
      )}
    </div>
  );
}
export { SurveyAdminActions };
