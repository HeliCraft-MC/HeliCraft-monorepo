// oxlint-disable import/max-dependencies -- Public state composition connects shared presentation and document navigation; domain logic stays in services.
import { useMemo } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { Icon, ActionLink, Dialog } from '@helicraft/atria';
import { StateCitizens } from './citizens';
import { uiText } from './text';
import { StateOverview } from './state-overview';
import { StateManagementLink } from './management-link';
import { StateHero } from './state-hero';
import { PublicGovernment } from './public-government';
import { ConstitutionDocument } from './constitution';
import styles from './public-detail.module.scss';

interface StateAccent extends CSSProperties {
  readonly '--state-accent': string;
}
function PublicStateDetail({
  state,
  publicView = true,
  flagUrl,
  children,
  backHref,
  backLabel,
}: Readonly<{
  state: StateDetail;
  publicView?: boolean;
  flagUrl?: string;
  children?: ReactNode;
  backHref?: string;
  backLabel?: string;
}>): ReactElement {
  const { locale } = useTranslation();
  const { configuration } = state;
  const accent = useMemo<StateAccent>(
    () => ({ '--state-accent': configuration.color }),
    [configuration.color],
  );
  return (
    <article className={styles.page} style={accent}>
      <a className={styles.back} href={backHref ?? (publicView ? '/states' : '/app')}>
        <Icon name="arrowLeft" />{' '}
        {backLabel ??
          uiText(
            locale,
            publicView ? 'Все государства' : 'Личный кабинет',
            publicView ? 'All states' : 'Account',
          )}
      </a>
      <StateHero state={state} publicView={publicView} flagUrl={flagUrl} />
      <div className={styles.toolbar}>
        <StateManagementLink state={state} />
      </div>
      {children !== undefined && <div className={styles.toolbar}>{children}</div>}
      <nav
        className={styles.navigation}
        aria-label={uiText(locale, 'Разделы государства', 'State sections')}
      >
        <a href="#state-overview">{uiText(locale, 'О государстве', 'About')}</a>
        <a href="#state-government">{uiText(locale, 'Управление', 'Government')}</a>
        <a href="#state-citizens">{uiText(locale, 'Граждане', 'Citizens')}</a>
        <a href="#state-constitution">{uiText(locale, 'Конституция', 'Constitution')}</a>
      </nav>
      <StateOverview state={state} />
      <section id="state-government" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>
            02 / {uiText(locale, 'Государственное устройство', 'Governance')}
          </span>
          <h2>{uiText(locale, 'Кто управляет государством', 'Who governs the state')}</h2>
          <p className={styles.muted}>
            {uiText(
              locale,
              'Действующие должности, их полномочия и правила назначения.',
              'Current offices, their authority and appointment rules.',
            )}
          </p>
        </div>
        <PublicGovernment state={state} />
      </section>
      <section id="state-citizens" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>03 / {uiText(locale, 'Сообщество', 'Community')}</span>
          <h2>
            {uiText(locale, 'Граждане государства', 'State citizens')}{' '}
            <span className={styles.count}>{state.citizens.length}</span>
          </h2>
        </div>
        {state.citizens.length === 0 ? (
          <p className={styles.panel}>
            {uiText(locale, 'В государстве пока нет граждан.', 'This state has no citizens yet.')}
          </p>
        ) : (
          <StateCitizens citizens={state.citizens} />
        )}
      </section>
      <section id="state-constitution" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>04 / {uiText(locale, 'Документ', 'Document')}</span>
          <h2>{uiText(locale, 'Конституция', 'Constitution')}</h2>
        </div>
        <p className={styles.muted}>
          {uiText(
            locale,
            'Полный документ открывается отдельно, чтобы длинная конституция не мешала знакомству с государством.',
            'Open the full document separately to read a long constitution comfortably.',
          )}
        </p>
        {state.status === 'ACTIVE' ? (
          <ActionLink href={`/states/${state.slug}/constitution`}>
            {uiText(locale, 'Читать конституцию', 'Read constitution')}
          </ActionLink>
        ) : (
          <Dialog
            title={uiText(locale, 'Конституция', 'Constitution')}
            size="fullscreen"
            trigger={uiText(locale, 'Читать конституцию', 'Read constitution')}
            closeLabel={uiText(locale, 'Закрыть', 'Close')}
          >
            <ConstitutionDocument
              configuration={configuration}
              founders={state.founders}
              html={state.constitutionHtml}
              showGovernanceWhenAbsent={false}
            />
          </Dialog>
        )}
      </section>
    </article>
  );
}
export { PublicStateDetail };
