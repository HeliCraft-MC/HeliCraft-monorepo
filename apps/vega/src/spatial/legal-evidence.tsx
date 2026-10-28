import type { ReactElement } from 'react';
import type { TerritorialApplication } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import styles from './territory-editor.module.scss';

function TerritoryLegalEvidence({
  application,
}: Readonly<{ application: TerritorialApplication }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <details className={styles.details}>
      <summary>{uiText(locale, 'Юридические сведения', 'Legal evidence')}</summary>
      <dl className={styles.summary}>
        <div>
          <dt>{uiText(locale, 'Заявка', 'Application')}</dt>
          <dd>{application.id}</dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Базовая ревизия', 'Base revision')}</dt>
          <dd>{application.draft.baseRevisionId ?? '—'}</dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Решение государства', 'State decision')}</dt>
          <dd>
            {application.decision.id} · {application.decision.status}
          </dd>
        </div>
      </dl>
    </details>
  );
}
export { TerritoryLegalEvidence };
