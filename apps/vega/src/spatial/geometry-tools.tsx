import { useCallback } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { Button } from '@helicraft/atria';
import {
  MousePointer2,
  Pentagon,
  SquareDashedMousePointer,
  Scissors,
  Trash2,
  Undo2,
  Redo2,
} from 'lucide-react';
import type { FlatGeometry, FlatMapMode } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import styles from './territory-editor.module.scss';

const modes: readonly {
  mode: FlatMapMode;
  ru: string;
  en: string;
  icon: ReactElement;
  hintRu: string;
  hintEn: string;
}[] = [
  {
    mode: 'view',
    ru: 'Навигация',
    en: 'Navigate',
    icon: <MousePointer2 aria-hidden="true" />,
    hintRu:
      'Перетаскивайте карту. Колесо или +/− меняют масштаб; стрелки перемещают карту с клавиатуры.',
    hintEn:
      'Drag to move the map. Use the wheel or +/− to zoom, and arrow keys to navigate with the keyboard.',
  },
  {
    mode: 'draw',
    ru: 'Добавить полигон',
    en: 'Add polygon',
    icon: <Pentagon aria-hidden="true" />,
    hintRu:
      'Отметьте вершины границы и нажмите первую точку, чтобы замкнуть контур. Escape отменяет рисование.',
    hintEn:
      'Place boundary points, then click the first point to close the shape. Escape cancels drawing.',
  },
  {
    mode: 'edit',
    ru: 'Изменить вершины',
    en: 'Edit vertices',
    icon: <SquareDashedMousePointer aria-hidden="true" />,
    hintRu:
      'Перетаскивайте вершины жёлтого контура. Соседние опубликованные границы доступны только для просмотра.',
    hintEn:
      'Drag the points of the yellow outline. Published neighboring boundaries are read-only.',
  },
  {
    mode: 'cut',
    ru: 'Вырезать отверстие',
    en: 'Cut a hole',
    icon: <Scissors aria-hidden="true" />,
    hintRu: 'Нарисуйте замкнутый контур внутри участка. Эта область будет исключена из территории.',
    hintEn:
      'Draw a closed shape inside your territory. This area will be excluded from the territory.',
  },
  {
    mode: 'remove',
    ru: 'Удалить полигон',
    en: 'Remove polygon',
    icon: <Trash2 aria-hidden="true" />,
    hintRu: 'Нажмите часть жёлтой территории, чтобы удалить её. Действие можно отменить.',
    hintEn: 'Click a yellow territory component to remove it. You can undo this action.',
  },
];
function GeometryTools({
  mode,
  setMode,
  geometry,
  undo,
  redo,
  canUndo,
  canRedo,
}: Readonly<{
  mode: FlatMapMode;
  setMode: (mode: FlatMapMode) => void;
  geometry: FlatGeometry | null;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const changeMode = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const target = modes.find((item) => item.mode === event.currentTarget.value);
      if (target) {
        setMode(target.mode);
      }
    },
    [setMode],
  );
  return (
    <section className={styles.tools}>
      <fieldset
        className={styles.toolset}
        aria-label={uiText(locale, 'Инструменты границ', 'Boundary tools')}
      >
        {modes.map((item) => (
          <Button
            key={item.mode}
            value={item.mode}
            onClick={changeMode}
            aria-pressed={mode === item.mode}
            tone={mode === item.mode ? 'primary' : 'quiet'}
            disabled={item.mode !== 'view' && item.mode !== 'draw' && geometry === null}
            title={uiText(locale, item.ru, item.en)}
            aria-label={uiText(locale, item.ru, item.en)}
          >
            {item.icon}
            <span className={styles.toolLabel}>{uiText(locale, item.ru, item.en)}</span>
          </Button>
        ))}
        <Button
          tone="quiet"
          onClick={undo}
          disabled={!canUndo}
          aria-label={uiText(locale, 'Отменить', 'Undo')}
          title={uiText(locale, 'Отменить', 'Undo')}
        >
          <Undo2 aria-hidden="true" />
          <span className={styles.toolLabel}>{uiText(locale, 'Отменить', 'Undo')}</span>
        </Button>
        <Button
          tone="quiet"
          onClick={redo}
          disabled={!canRedo}
          aria-label={uiText(locale, 'Повторить', 'Redo')}
          title={uiText(locale, 'Повторить', 'Redo')}
        >
          <Redo2 aria-hidden="true" />
          <span className={styles.toolLabel}>{uiText(locale, 'Повторить', 'Redo')}</span>
        </Button>
      </fieldset>
      <p className={styles.muted} aria-live="polite">
        {uiText(
          locale,
          modes.find((item) => item.mode === mode)?.hintRu ?? '',
          modes.find((item) => item.mode === mode)?.hintEn ?? '',
        )}
      </p>
    </section>
  );
}
export { GeometryTools };
