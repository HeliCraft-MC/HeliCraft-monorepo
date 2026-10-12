import type { ReactElement } from 'react';
import type { StateCardProps } from './state-card';
import styles from './state-card.module.scss';

function StateFacts({ facts }: Pick<StateCardProps, 'facts'>): ReactElement | null {
  return facts ? (
    <dl className={styles.facts}>
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  ) : null;
}
export { StateFacts };
