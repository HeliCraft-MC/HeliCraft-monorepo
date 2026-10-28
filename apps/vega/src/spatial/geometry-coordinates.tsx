import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { Alert, Button, FormField, Textarea } from '@helicraft/atria';
import type { FlatGeometry } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { geometryInput } from './geometry';
import styles from './territory-editor.module.scss';

const JSON_INDENT = 2;
function GeometryCoordinates({
  geometry,
  onChange,
}: Readonly<{
  geometry: FlatGeometry | null;
  onChange: (geometry: FlatGeometry | null) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const [json, setJson] = useState('');
  const [error, setError] = useState('');
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
    <details className={styles.details}>
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
          'GeoJSON использует [X,Z]. Первое кольцо — внешняя граница, остальные — отверстия. Проверка границ обязательна перед отправкой.',
          'GeoJSON uses [X,Z]. The first ring is the exterior; subsequent rings are holes. Boundary validation is required before submission.',
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
      <Button onClick={apply}>{uiText(locale, 'Применить координаты', 'Apply coordinates')}</Button>
      {error && <Alert tone="danger">{error}</Alert>}
    </details>
  );
}
export { GeometryCoordinates };
