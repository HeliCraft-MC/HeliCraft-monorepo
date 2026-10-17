// oxlint-disable import/max-dependencies -- Response review composes typed pagination, confirmation and player identity controls.
import { useMemo, useState, useCallback } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listSurveyResponses, deleteSurveyResponse } from '@helicraft/alhena';
import type { SurveyAnswer, VotingInput } from '@helicraft/alhena';
import { Alert, Button, Dialog } from '@helicraft/atria';
import { PlayerNickname } from '../player-nickname';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import type { Locale } from '../locales';
import styles from './survey.module.scss';

const PAGE_SIZE = 20;
function answerText(input: VotingInput, answer: SurveyAnswer | undefined, locale: Locale): string {
  if (!answer) {
    return '—';
  }
  return typeof answer.value === 'string'
    ? answer.value
    : answer.value
        .map((id) =>
          displayText(input.options.find((option) => option.id === id)?.label ?? {}, locale),
        )
        .join(', ');
}
function SurveyResponses({
  id,
  input,
}: Readonly<{ id: string; input: VotingInput }>): ReactElement {
  const { locale } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['survey-responses', id, page],
    queryFn: async () => {
      const result = await listSurveyResponses({
        client: browserClient(),
        path: { id },
        query: { page, pageSize: PAGE_SIZE },
        throwOnError: true,
      });
      return result.data;
    },
  });
  const remove = useMutation({
    mutationFn: async (responseId: string) => {
      await deleteSurveyResponse({
        client: browserClient(),
        path: { id, responseId },
        throwOnError: true,
      });
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: ['survey-responses', id] });
      await queryClient.invalidateQueries({ queryKey: ['voting', id] });
    },
  });
  const scope = useMemo(() => [page, deleting, remove.mutate], [page, deleting, remove.mutate]);
  const click = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  const closeDialog = useCallback((open: boolean): void => {
    if (!open) {
      setDeleting(null);
    }
  }, []);
  const questions =
    input.survey?.blocks.filter((block) => !['TEXT_BLOCK', 'IMAGE_BLOCK'].includes(block.type)) ??
    [];
  return (
    <section className={styles.editor}>
      <h3>
        {uiText(locale, 'Отдельные ответы', 'Individual responses')} ({query.data?.total ?? 0})
      </h3>
      <div className={styles.table}>
        <table>
          <thead>
            <tr>
              <th>{uiText(locale, 'Участник', 'Respondent')}</th>
              <th>{uiText(locale, 'Дата', 'Date')}</th>
              {questions.map((block) => (
                <th key={block.id}>{displayText(block.title, locale)}</th>
              ))}
              <th>{uiText(locale, 'Действия', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.items ?? []).map((response) => (
              <tr key={response.id}>
                <td>
                  <PlayerNickname name={response.username} id={response.userId} />
                </td>
                <td>{new Date(response.castAt).toLocaleString(locale)}</td>
                {questions.map((block) => (
                  <td key={block.id}>
                    {answerText(
                      input,
                      response.answers.find((answer) => answer.questionId === block.id),
                      locale,
                    )}
                  </td>
                ))}
                <td>
                  <Button
                    tone="quiet"
                    onClick={click(response.id, () => {
                      setDeleting(response.id);
                    })}
                  >
                    {uiText(locale, 'Удалить ответ', 'Delete response')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {query.isPending && <output>{uiText(locale, 'Загрузка…', 'Loading…')}</output>}
      {query.data?.total === 0 && <p>{uiText(locale, 'Ответов пока нет.', 'No responses yet.')}</p>}
      <div className={styles.toolbar}>
        <Button
          tone="quiet"
          disabled={page === 1}
          onClick={click('prev', () => {
            setPage(page - 1);
          })}
        >
          {uiText(locale, 'Предыдущая страница', 'Previous page')}
        </Button>
        <span>{page}</span>
        <Button
          tone="quiet"
          disabled={page * PAGE_SIZE >= (query.data?.total ?? 0)}
          onClick={click('next', () => {
            setPage(page + 1);
          })}
        >
          {uiText(locale, 'Следующая страница', 'Next page')}
        </Button>
      </div>
      <Dialog
        open={deleting !== null}
        onOpenChange={closeDialog}
        title={uiText(locale, 'Удалить ответ?', 'Delete response?')}
        closeLabel={uiText(locale, 'Закрыть', 'Close')}
      >
        <p>
          {uiText(
            locale,
            'Ответ будет удалён из статистики. Участник сможет ответить снова.',
            'The response will be removed from statistics. The participant can respond again.',
          )}
        </p>
        <Button
          disabled={remove.isPending}
          onClick={click('delete', () => {
            if (deleting !== null) {
              remove.mutate(deleting);
            }
          })}
        >
          {uiText(locale, 'Подтвердить удаление', 'Confirm deletion')}
        </Button>
        {remove.isError && <Alert tone="danger">{errorMessage(remove.error)}</Alert>}
      </Dialog>
      {query.isError && <Alert tone="danger">{errorMessage(query.error)}</Alert>}
    </section>
  );
}
export { SurveyResponses };
