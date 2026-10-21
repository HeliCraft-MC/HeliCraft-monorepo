import type { ReactElement } from 'react';
import type { LedgerTransaction } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { MonetaryPlayer } from './player';

function HistoryActors({ entry }: Readonly<{ entry: LedgerTransaction }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <>
      <div>
        <dt>{uiText(locale, 'Инициатор', 'Initiated by')}</dt>
        <dd>
          <MonetaryPlayer id={entry.initiatorId} />
        </dd>
      </div>
      <div>
        <dt>{uiText(locale, 'Исполнитель', 'Executed by')}</dt>
        <dd>
          <MonetaryPlayer id={entry.actorId} />
        </dd>
      </div>
    </>
  );
}
export { HistoryActors };
