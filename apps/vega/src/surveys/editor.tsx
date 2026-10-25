import { useCallback, useMemo } from 'react';
import type { ComponentProps, DragEvent, ReactElement } from 'react';
import type { VotingInput } from '@helicraft/alhena';
import { Button, Checkbox, Icon } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { insertBlock, moveBlock, MAX_BLOCKS } from './model';
import { BlockEditor } from './block-editor';
import styles from './survey.module.scss';

function SurveyEditor({
  input,
  onChange,
}: Readonly<{ input: VotingInput; onChange: (input: VotingInput) => void }>): ReactElement {
  const { locale } = useTranslation();
  const add = useCallback((): void => {
    onChange(insertBlock(input, input.survey?.blocks.length ?? 0));
  }, [input, onChange]);
  const scope = useMemo(() => [input, onChange], [input, onChange]);
  const drop = usePropCache<(event: DragEvent<HTMLDivElement>) => void>(scope);
  const check = usePropCache<NonNullable<ComponentProps<typeof Checkbox>['onChange']>>(scope);
  const allowDrop = useCallback((event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
  }, []);
  return (
    <div className={styles.editor}>
      <Checkbox
        label={uiText(locale, 'Один ответ на пользователя', 'One response per user')}
        checked={input.survey?.oneResponsePerUser ?? true}
        onChange={check('one-response', (event) => {
          if (input.survey) {
            onChange({
              ...input,
              survey: { ...input.survey, oneResponsePerUser: event.currentTarget.checked },
            });
          }
        })}
      />
      <Checkbox
        label={uiText(
          locale,
          'Принимать ответы до ручного закрытия',
          'Accept responses until closed manually',
        )}
        checked={input.survey?.manualClose === true}
        onChange={check('manual-close', (event) => {
          if (input.survey) {
            onChange({
              ...input,
              survey: { ...input.survey, manualClose: event.currentTarget.checked },
            });
          }
        })}
      />
      <p>
        {uiText(
          locale,
          'Ответы связаны с аккаунтами и доступны администраторам. Отключите ограничение, если хотите принимать повторные ответы.',
          'Responses are linked to accounts and visible to administrators. Turn off the limit to accept repeat responses.',
        )}
      </p>
      {(input.survey?.blocks ?? []).map((block, index) => (
        <div
          key={block.id}
          onDragOver={allowDrop}
          onDrop={drop(block.id, (event) => {
            event.preventDefault();
            onChange(moveBlock(input, event.dataTransfer.getData('text/plain'), index));
          })}
        >
          <BlockEditor input={input} block={block} index={index} onChange={onChange} />
        </div>
      ))}
      <Button
        tone="quiet"
        disabled={(input.survey?.blocks.length ?? 0) >= MAX_BLOCKS}
        onClick={add}
      >
        <Icon name="add" />
        {uiText(locale, 'Добавить блок', 'Add block')}
      </Button>
    </div>
  );
}
export { SurveyEditor };
