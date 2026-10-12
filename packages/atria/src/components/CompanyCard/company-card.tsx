import type { ReactElement, ReactNode } from 'react';
import styles from './company-card.module.scss';

interface CompanyCardProps {
  readonly name: string;
  readonly sector: string;
  readonly description: string;
  readonly image: string;
  readonly logo: ReactNode;
  readonly facts: readonly { label: string; value: string }[];
}
function CompanyCard({
  name,
  sector,
  description,
  image,
  logo,
  facts,
}: CompanyCardProps): ReactElement {
  return (
    <article className={styles.card}>
      <div className={styles.visual}>
        <img src={image} alt="" loading="lazy" />
        <span className={styles.logo} aria-hidden="true">
          {logo}
        </span>
      </div>
      <div className={styles.body}>
        <p className={styles.sector}>{sector}</p>
        <h3>{name}</h3>
        <p className={styles.description}>{description}</p>
        <dl className={styles.facts}>
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
export { CompanyCard, type CompanyCardProps };
