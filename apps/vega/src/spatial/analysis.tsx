import type { ReactElement } from 'react';
import type { SpatialAnalysis } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { StateNameById } from '../state-name-by-id';

function TerritoryAnalysis({ analysis }: Readonly<{ analysis: SpatialAnalysis }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section aria-label={uiText(locale, 'Проверка геометрии', 'Geometry validation')}>
      <p>
        {uiText(locale, 'Площадь', 'Area')}: {analysis.area.toLocaleString(locale)}{' '}
        {uiText(locale, 'блоков²', 'blocks²')} · {uiText(locale, 'Вершины', 'Vertices')}:{' '}
        {analysis.vertices}
      </p>
      <p>
        +{analysis.addedArea.toLocaleString(locale)} / −
        {analysis.removedArea.toLocaleString(locale)} {uiText(locale, 'блоков²', 'blocks²')}
      </p>
      {!analysis.valid && <Alert tone="danger">{analysis.problem}</Alert>}
      {analysis.conflicts.length > 0 && (
        <Alert tone="danger">
          {uiText(
            locale,
            'Конфликт с утверждёнными территориями',
            'Conflict with ratified territories',
          )}
          <ul>
            {analysis.conflicts.map((conflict) => (
              <li key={conflict.stateId}>
                <StateNameById id={conflict.stateId} color="#859b76" />:{' '}
                {conflict.area.toLocaleString(locale)} {uiText(locale, 'блоков²', 'blocks²')}
              </li>
            ))}
          </ul>
        </Alert>
      )}
      {analysis.warnings.map((warning) => (
        <Alert key={warning}>
          {warning === 'NARROW_OR_COMPLEX_SHAPE'
            ? uiText(
                locale,
                'Узкая или сложная граница: администрации потребуется проверить её обоснованность.',
                'Narrow or complex boundary: administrators must review its justification.',
              )
            : uiText(
                locale,
                'Несвязанные части территории требуют отдельной оценки администрации.',
                'Disconnected territory components require administrative review.',
              )}
        </Alert>
      ))}
    </section>
  );
}
export { TerritoryAnalysis };
