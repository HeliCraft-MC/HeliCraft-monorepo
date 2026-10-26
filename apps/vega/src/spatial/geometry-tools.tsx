import { useCallback, useState } from 'react';
import type { ChangeEvent, MouseEvent, ReactElement } from 'react';
import { Alert, Button, FormField, Textarea } from '@helicraft/atria';
import type { FlatGeometry, FlatMapMode } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { geometryInput } from './geometry';
import styles from './spatial.module.scss';

const JSON_INDENT = 2;
const modes: readonly { mode: FlatMapMode; ru: string; en: string }[] = [
  { mode: 'view', ru: 'Навигация', en: 'Navigate' },
  { mode: 'draw', ru: 'Добавить полигон', en: 'Add polygon' },
  { mode: 'edit', ru: 'Изменить вершины', en: 'Edit vertices' },
  { mode: 'cut', ru: 'Вырезать отверстие', en: 'Cut a hole' },
  { mode: 'remove', ru: 'Удалить полигон', en: 'Remove polygon' },
];
function GeometryTools({
  mode,
  setMode,
  geometry,
  onChange,
  undo,
  redo,
  canUndo,
  canRedo,
}: Readonly<{
  mode: FlatMapMode;
  setMode: (mode: FlatMapMode) => void;
  geometry: FlatGeometry | null;
  onChange: (geometry: FlatGeometry | null) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
  const changeMode = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const target = modes.find((item) => item.mode === event.currentTarget.value);
      if (target) {
        setMode(target.mode);
      }
    },
    [setMode],
  );
  const changeJson = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    setJson(event.currentTarget.value);
  }, []);
  const load = useCallback((): void => {
    setJson(JSON.stringify(geometry, null, JSON_INDENT));
    setError('');
  }, [geometry]);
  const apply = useCallback((): void => {
    try {
      onChange(geometryInput.parse(JSON.parse(json)));
      setError('');
    } catch {
      setError(
        uiText(
          locale,
          'Проверьте GeoJSON: Polygon/MultiPolygon, замкнутые кольца и конечные координаты [X,Z].',
          'Check GeoJSON: Polygon/MultiPolygon, closed rings and finite [X,Z] coordinates.',
        ),
      );
    }
  }, [json, locale, onChange]);
  return (
    <section className={styles.panel}>
      <div
        className={styles.toolbar}
        aria-label={uiText(locale, 'Инструменты границ', 'Boundary tools')}
      >
        {modes.map((item) => (
          <Button
            key={item.mode}
            value={item.mode}
            onClick={changeMode}
            aria-pressed={mode === item.mode}
            tone={mode === item.mode ? 'primary' : 'quiet'}
          >
            {uiText(locale, item.ru, item.en)}
          </Button>
        ))}
        <Button onClick={undo} disabled={!canUndo}>
          {uiText(locale, 'Отменить', 'Undo')}
        </Button>
        <Button onClick={redo} disabled={!canRedo}>
          {uiText(locale, 'Повторить', 'Redo')}
        </Button>
      </div>
      <p>
        {uiText(
          locale,
          'Замкните полигон щелчком по первой вершине. Отверстие рисуется внутри существующего полигона инструментом вырезания. Второй полигон создаёт отдельную часть территории. Escape отменяет рисование; стрелки и +/− перемещают и масштабируют карту.',
          'Close a polygon by clicking its first vertex. Draw a cut inside an existing polygon to create a hole. Another polygon creates a disconnected territory component. Escape cancels drawing; arrows and +/− pan and zoom the map.',
        )}
      </p>
      <details>
        <summary>
          {uiText(
            locale,
            'Координаты и клавиатурное редактирование',
            'Coordinates and keyboard editing',
          )}
        </summary>
        <p>
          {uiText(
            locale,
            'GeoJSON использует [X,Z]. Первое кольцо — внешняя граница, остальные — отверстия. Проверка PostGIS обязательна перед отправкой.',
            'GeoJSON uses [X,Z]. The first ring is the exterior; subsequent rings are holes. PostGIS validation is required before submission.',
          )}
        </p>
        <Button onClick={load}>
          {uiText(locale, 'Загрузить текущие координаты', 'Load current coordinates')}
        </Button>
        <FormField label="GeoJSON [X,Z]" htmlFor="territory-coordinates">
          <Textarea
            id="territory-coordinates"
            value={json}
            onChange={changeJson}
            className={styles.code}
          />
        </FormField>
        <Button onClick={apply}>
          {uiText(locale, 'Применить координаты', 'Apply coordinates')}
        </Button>
        {error && <Alert tone="danger">{error}</Alert>}
      </details>
    </section>
  );
}
export { GeometryTools };
