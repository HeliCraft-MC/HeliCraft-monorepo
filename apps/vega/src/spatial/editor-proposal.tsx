import type { ReactElement } from 'react';
import { Button } from '@helicraft/atria';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { useTranslation } from '../i18n';
import { uiText, displayText } from '../states/text';
import { EditorFields } from './editor-fields';
import { TerritoryAnalysis } from './analysis';
import type { useTerritoryEditor } from './use-territory-editor';
import styles from './territory-editor.module.scss';

function TerritoryProposal({
  editor,
}: Readonly<{ editor: ReturnType<typeof useTerritoryEditor> }>): ReactElement {
  const { locale } = useTranslation();
  const {
    reason,
    change,
    setReason,
    setChange,
    ready,
    save,
    mutation,
    history,
    dirty,
    analysis,
    back,
    open,
  } = editor;
  return (
    <>
      <section className={styles.card}>
        <h3>{uiText(locale, 'Что меняется и почему', 'What changes and why')}</h3>
        <p className={styles.muted}>
          {uiText(
            locale,
            'Опишите цель изменения. Обоснование войдёт в неизменяемое предложение и будет доступно участникам решения.',
            'Describe the purpose of the change. Your reason becomes part of the immutable proposal and is available to decision participants.',
          )}
        </p>
        <EditorFields reason={reason} change={change} onReason={setReason} onChange={setChange} />
      </section>
      <section className={styles.card}>
        <h3>{uiText(locale, 'Проверка перед отправкой', 'Check before submission')}</h3>
        <p className={styles.muted}>
          {uiText(
            locale,
            'Сохраните черновик и проверьте границы. Если измените карту или обоснование, проверку потребуется повторить.',
            'Save your draft and validate its boundaries. Changes to the map or reason require another check.',
          )}
        </p>
        <Button
          tone={ready ? 'quiet' : 'primary'}
          onClick={save}
          disabled={mutation.isPending || history.geometry === null}
        >
          <Save aria-hidden="true" />
          {uiText(locale, 'Сохранить и проверить', 'Save and validate')}
        </Button>
        {!dirty && analysis && <TerritoryAnalysis analysis={analysis} />}
      </section>
      <p className={styles.muted}>
        {uiText(
          locale,
          'После отправки границы и обоснование нельзя изменить. Новая территория появится на официальной карте после государственного решения и административной ратификации.',
          'Submission freezes the boundaries and reasoning. The official map changes after the state decision and administrative ratification.',
        )}
      </p>
      {!displayText(reason, locale).trim() && (
        <p className={styles.muted}>
          {uiText(
            locale,
            'Добавьте обоснование, чтобы отправить предложение.',
            'Add a reason to submit this proposal.',
          )}
        </p>
      )}
      <div className={styles.footer}>
        <Button tone="quiet" onClick={back}>
          <ArrowLeft aria-hidden="true" />
          {uiText(locale, 'Вернуться к границам', 'Back to boundaries')}
        </Button>
        <Button onClick={open} disabled={!ready}>
          <Send aria-hidden="true" />
          {uiText(locale, 'Отправить на государственное решение', 'Submit for state decision')}
        </Button>
      </div>
    </>
  );
}
export { TerritoryProposal };
