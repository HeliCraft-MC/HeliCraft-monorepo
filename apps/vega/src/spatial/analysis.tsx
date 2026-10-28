import type { ReactElement } from 'react';
import type { SpatialAnalysis } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { StateNameById } from '../state-name-by-id';
import styles from './territory-editor.module.scss';

function TerritoryAnalysis({ analysis }: Readonly<{ analysis: SpatialAnalysis }>): ReactElement {
  const { locale } = useTranslation();
  const clear = analysis.valid && analysis.conflicts.length === 0;
  return (
    <section
      className={styles.section}
      aria-label={uiText(locale, 'Проверка геометрии', 'Geometry validation')}
    >
      {clear && (
        <Alert tone="success">
          {uiText(
            locale,
            'Границы прошли проверку. Пересечений с утверждёнными территориями нет.',
            'Boundaries passed validation. There are no overlaps with published territories.',
          )}
        </Alert>
      )}
      {!analysis.valid && (
        <Alert tone="danger">
          <p>{uiText(locale, 'Границы требуют исправления', 'The boundaries need correction')}</p>
          <p>{analysis.problem}</p>
        </Alert>
      )}
      {analysis.conflicts.length > 0 && (
        <Alert tone="danger">
          <p>
            {uiText(
              locale,
              'Участок пересекает утверждённые территории. Измените границу и повторите проверку.',
              'The proposal overlaps published territories. Adjust the boundary and validate again.',
            )}
          </p>
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
      <dl className={styles.summary}>
        <div>
          <dt>{uiText(locale, 'Площадь территории', 'Territory area')}</dt>
          <dd>
            {analysis.area.toLocaleString(locale)} {uiText(locale, 'блоков²', 'blocks²')}
          </dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Добавится', 'Added area')}</dt>
          <dd>
            +{analysis.addedArea.toLocaleString(locale)} {uiText(locale, 'блоков²', 'blocks²')}
          </dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Будет исключено', 'Removed area')}</dt>
          <dd>
            −{analysis.removedArea.toLocaleString(locale)} {uiText(locale, 'блоков²', 'blocks²')}
          </dd>
        </div>
      </dl>
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
