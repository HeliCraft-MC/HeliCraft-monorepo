import { useMemo, useCallback } from 'react';
import type { ComponentProps, DragEvent, ReactElement } from 'react';
import type { SurveyBlock, VotingInput } from '@helicraft/alhena';
import { Button, Icon } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { usePropCache } from '../states/use-prop-cache';
import { insertBlock, removeBlock, moveBlock, MAX_BLOCKS, MAX_OPTIONS } from './model';
import styles from './survey.module.scss';

function BlockToolbar({
  input,
  block,
  index,
  onChange,
}: Readonly<{
  input: VotingInput;
  block: SurveyBlock;
  index: number;
  onChange: (input: VotingInput) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const scope = useMemo(() => [input, block, index, onChange], [input, block, index, onChange]);
  const click = usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(scope);
  const startDrag = useCallback(
    (event: DragEvent<HTMLButtonElement>): void => {
      event.dataTransfer.setData('text/plain', block.id);
      event.dataTransfer.effectAllowed = 'move';
    },
    [block.id],
  );
  const full = (input.survey?.blocks.length ?? 0) >= MAX_BLOCKS;
  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        draggable
        onDragStart={startDrag}
        title={uiText(
          locale,
          'Перетащить блок; также доступны кнопки выше и ниже',
          'Drag block; move up and down buttons are also available',
        )}
      >
        <Icon name="drag" /> {index + 1}
      </button>
      <Button
        tone="quiet"
        disabled={index === 0}
        onClick={click('up', () => {
          onChange(moveBlock(input, block.id, index - 1));
        })}
      >
        <Icon name="arrowUp" />
        {uiText(locale, 'Выше', 'Move up')}
      </Button>
      <Button
        tone="quiet"
        disabled={index + 1 === input.survey?.blocks.length}
        onClick={click('down', () => {
          onChange(moveBlock(input, block.id, index + 1));
        })}
      >
        <Icon name="arrowDown" />
        {uiText(locale, 'Ниже', 'Move down')}
      </Button>
      <details className={styles.blockMenu}>
        <summary>{uiText(locale, 'Действия с блоком', 'Block actions')}</summary>
        <div className={styles.editor}>
          <Button
            tone="quiet"
            disabled={full || input.options.length + block.optionIds.length > MAX_OPTIONS}
            onClick={click('copy', () => {
              onChange(insertBlock(input, index + 1, block));
            })}
          >
            <Icon name="copy" />
            {uiText(locale, 'Копировать', 'Duplicate')}
          </Button>
          <Button
            tone="quiet"
            disabled={full}
            onClick={click('before', () => {
              onChange(insertBlock(input, index));
            })}
          >
            {uiText(locale, 'Вставить перед', 'Insert before')}
          </Button>
          <Button
            tone="quiet"
            disabled={full}
            onClick={click('after', () => {
              onChange(insertBlock(input, index + 1));
            })}
          >
            {uiText(locale, 'Вставить после', 'Insert after')}
          </Button>
          <Button
            tone="quiet"
            onClick={click('remove', () => {
              onChange(removeBlock(input, block));
            })}
          >
            <Icon name="delete" />
            {uiText(locale, 'Удалить блок', 'Remove block')}
          </Button>
        </div>
      </details>
    </div>
  );
}
export { BlockToolbar };
