import type { ReactElement } from 'react';
import type { VotingDetail } from '@helicraft/alhena';
import { Badge } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText, displayText, label } from './text';
import styles from './states.module.scss';

function VotingHeading({ voting }: Readonly<{ voting: VotingDetail }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <>
      <div className={styles.heading}>
        <h2>{displayText(voting.input.title, locale)}</h2>
        <Badge>{label(`VOTING_${voting.status}`, locale)}</Badge>
      </div>
      <p className={styles.hint}>{displayText(voting.input.description, locale)}</p>
      <p className={styles.hint}>
        {uiText(locale, 'Плановый период:', 'Scheduled window:')}{' '}
        <time dateTime={voting.input.opensAt}>
          {new Date(voting.input.opensAt).toLocaleString(locale)}
        </time>{' '}
        —{' '}
        {voting.input.survey?.manualClose === true ? (
          uiText(locale, 'До ручного закрытия', 'Until closed manually')
        ) : (
          <time dateTime={voting.input.closesAt}>
            {new Date(voting.input.closesAt).toLocaleString(locale)}
          </time>
        )}
      </p>
    </>
  );
}
export { VotingHeading };
