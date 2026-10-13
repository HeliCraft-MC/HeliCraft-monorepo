import { StateFacts } from './state-facts';
import { StateVisual } from './state-visual';
import { Icon } from '../icon';
import type { ReactElement, ReactNode } from 'react';
import styles from './state-card.module.scss';

interface StateCardProps {
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
function StateCard(props: StateCardProps): ReactElement {
  const {
    name,
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
        <h3>{name}</h3>
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
    <a className={styles.card} href={href}>
      {content}
    </a>
  ) : (
    <article className={styles.card}>{content}</article>
  );
}
export { StateCard, type StateCardProps };
