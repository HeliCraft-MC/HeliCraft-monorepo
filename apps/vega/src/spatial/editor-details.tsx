import type { ReactElement } from 'react';
import type { TerritoryDraft } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { TerritoryHistory } from './history';
import styles from './territory-editor.module.scss';

function TerritoryDraftDetails({ draft }: Readonly<{ draft: TerritoryDraft }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <details className={styles.details}>
      <summary>
        {uiText(
          locale,
          'История границ и сведения о черновике',
          'Boundary history and draft details',
        )}
      </summary>
      <dl className={styles.summary}>
        <div>
          <dt>{uiText(locale, 'Черновик', 'Draft')}</dt>
          <dd>{draft.id}</dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Версия', 'Version')}</dt>
          <dd>{draft.version}</dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Базовая ревизия', 'Base revision')}</dt>
          <dd>{draft.baseRevisionId ?? uiText(locale, 'Первая территория', 'First territory')}</dd>
        </div>
      </dl>
      <TerritoryHistory worldId={draft.worldId} stateId={draft.stateId} />
    </details>
  );
}
export { TerritoryDraftDetails };
