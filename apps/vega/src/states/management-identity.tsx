import { useMemo } from 'react';
import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { Link } from '@tanstack/react-router';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from './text';
import { BannerPreview } from './banner-preview';
import styles from './management.module.scss';

const entryLabels = {
  OPEN: ['Свободный', 'Open'],
  BY_APPLICATION: ['По заявке', 'By application'],
  BY_INVITATION: ['По приглашению', 'By invitation'],
} as const;

function ManagementIdentity({
  state,
  onReform,
  pending,
}: Readonly<{ state: StateDetail; onReform: () => void; pending: boolean }>): ReactElement {
  const { locale } = useTranslation();
  const { configuration } = state;
  const publicParams = useMemo(() => ({ slug: state.slug }), [state.slug]);
  return (
    <section className={styles.card}>
      <div className={styles.cardHeading}>
        <h2>{uiText(locale, 'Государство', 'State')}</h2>
        {state.status === 'ACTIVE' && (
          <Button tone="quiet" onClick={onReform} disabled={pending}>
            {uiText(locale, 'Предложить изменение', 'Propose a change')}
          </Button>
        )}
      </div>
      <div className={styles.identity}>
        <div className={styles.flag}>
          {configuration.horizontalFlag.mode === 'BANNER' ? (
            <BannerPreview
              design={configuration.horizontalFlag.design}
              horizontal
              label={uiText(locale, 'Флаг государства', 'State flag')}
            />
          ) : (
            <img
              src={`/api/v1/account/states/${state.id}/flag`}
              alt={uiText(locale, 'Флаг государства', 'State flag')}
            />
          )}
        </div>
        <div>
          <h3>{displayText(configuration.name, locale)}</h3>
          <p>{displayText(configuration.description, locale)}</p>
        </div>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>{uiText(locale, 'Приём граждан', 'Citizen entry')}</dt>
          <dd>
            {uiText(
              locale,
              entryLabels[configuration.citizenship.entryMode][0],
              entryLabels[configuration.citizenship.entryMode][1],
            )}
          </dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Несколько гражданств', 'Multiple citizenships')}</dt>
          <dd>
            {uiText(
              locale,
              configuration.citizenship.allowMultipleCitizenships ? 'Разрешены' : 'Запрещены',
              configuration.citizenship.allowMultipleCitizenships ? 'Allowed' : 'Not allowed',
            )}
          </dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Редакция правил', 'Rules revision')}</dt>
          <dd>№ {state.governanceRevision}</dd>
        </div>
        <div>
          <dt>{uiText(locale, 'Дата создания', 'Established')}</dt>
          <dd>{new Date(state.createdAt).toLocaleDateString(locale)}</dd>
        </div>
      </dl>
      {state.status === 'ACTIVE' && (
        <Link to="/states/$slug/constitution" params={publicParams}>
          {uiText(locale, 'Открыть конституцию ↗', 'Read constitution ↗')}
        </Link>
      )}
    </section>
  );
}
export { ManagementIdentity };
