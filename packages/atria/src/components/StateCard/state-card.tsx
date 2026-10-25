import { useMemo } from 'react';
import { StateFacts } from './state-facts';
import { StateVisual } from './state-visual';
import { StateName } from '../StateName/state-name';
import { Icon } from '../icon';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import styles from './state-card.module.scss';

interface StateCardProps {
  readonly color?: string;
  readonly name: string;
  readonly government?: string;
  readonly citizens?: number;
  readonly flag: string | ReactNode;
  readonly image?: string;
  readonly silhouette?: string;
  readonly href?: string;
  readonly description?: string;
  readonly facts?: readonly { label: string; value: string }[];
  readonly flagLabel?: string;
  readonly populationLabel?: string;
}
// oxlint-disable-next-line max-lines-per-function -- Shared card composition keeps the optional visual, facts and navigation aligned.
function StateCard(props: StateCardProps): ReactElement {
  const {
    name,
    color,
    government,
    citizens,
    flag,
    image,
    silhouette,
    href,
    description,
    facts,
    flagLabel = 'Флаг',
    populationLabel = 'граждан',
  } = props;
  const accent = useMemo<CSSProperties & { '--state-accent': string }>(
    () => ({ '--state-accent': color ?? 'var(--primary)' }),
    [color],
  );
  const content = (
    <>
      <StateVisual
        name={name}
        flag={flag}
        image={image}
        silhouette={silhouette}
        flagLabel={flagLabel}
      />
      <div className={styles.body}>
        <p className={styles.government}>{government ?? 'Устройство определяется конституцией'}</p>
        <h3>
          <StateName
            name={name}
            color={color ?? 'var(--primary)'}
            href={href ?? ''}
            linked={false}
          />
        </h3>
        {description !== undefined && description !== '' && (
          <p className={styles.description}>{description}</p>
        )}
        <StateFacts facts={facts} />
        {citizens !== undefined && (
          <p className={styles.population}>
            {citizens} · {populationLabel}
          </p>
        )}
        {href !== undefined && href !== '' && <Icon name="arrowUpRight" />}
      </div>
    </>
  );
  return href !== undefined && href !== '' ? (
    <a className={styles.card} style={accent} href={href} aria-label={name}>
      {content}
    </a>
  ) : (
    <article className={styles.card} style={accent}>
      {content}
    </article>
  );
}
export { StateCard, type StateCardProps };
