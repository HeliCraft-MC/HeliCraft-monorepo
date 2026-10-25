import { useMemo } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { EntityLink } from '../PlayerNickname/entity-link';
import styles from './company-name.module.scss';

interface CompanyNameProps {
  readonly name: string;
  readonly href: string;
  readonly color?: string;
  readonly logoUrl?: string;
  readonly description?: string;
  readonly facts?: string;
  readonly onPreview?: () => void;
  readonly linked?: boolean;
}
function CompanyName({
  name,
  href,
  color = 'var(--primary)',
  logoUrl,
  description,
  facts,
  onPreview,
  linked = true,
}: CompanyNameProps): ReactElement {
  const accent = useMemo<CSSProperties>(() => ({ backgroundColor: color }), [color]);
  const preview = useMemo(() => ({ title: name, description, facts }), [name, description, facts]);
  const content = (
    <>
      <span className={styles.mark} style={accent} aria-hidden="true">
        {logoUrl !== undefined && <img src={logoUrl} alt="" width="20" height="20" />}
      </span>
      <span>{name}</span>
    </>
  );
  return linked ? (
    <EntityLink href={href} name={name} preview={preview} onPreview={onPreview}>
      {content}
    </EntityLink>
  ) : (
    <span className={styles.name}>{content}</span>
  );
}
export { CompanyName, type CompanyNameProps };
