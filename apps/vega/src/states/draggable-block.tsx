import { useCallback } from 'react';
import type { DragEvent, ReactElement, ReactNode } from 'react';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import styles from './states.module.scss';

function DraggableBlock({
  id,
  onReorder,
  children,
}: Readonly<{
  id: string;
  onReorder: (sourceId: string, targetId: string) => void;
  children: ReactNode;
}>): ReactElement {
  const { locale } = useTranslation();
  const handleDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>): void => {
      event.dataTransfer.setData('application/x-helicraft-constitution-block', id);
      event.dataTransfer.effectAllowed = 'move';
    },
    [id],
  );
  const handleDragOver = useCallback((event: DragEvent<HTMLLIElement>): void => {
    if (event.dataTransfer.types.includes('application/x-helicraft-constitution-block')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);
  const handleDrop = useCallback(
    (event: DragEvent<HTMLLIElement>): void => {
      const sourceId = event.dataTransfer.getData('application/x-helicraft-constitution-block');
      if (sourceId !== '') {
        event.preventDefault();
        onReorder(sourceId, id);
      }
    },
    [id, onReorder],
  );
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Native drag events reorder blocks; labelled Move Up/Down buttons provide the keyboard alternative.
    <li className={styles.card} onDragOver={handleDragOver} onDrop={handleDrop}>
      <Button tone="quiet" className={styles.dragHandle} draggable onDragStart={handleDragStart}>
        {uiText(locale, 'Перетащить блок', 'Drag block')}
      </Button>
      {children}
    </li>
  );
}
export { DraggableBlock };
