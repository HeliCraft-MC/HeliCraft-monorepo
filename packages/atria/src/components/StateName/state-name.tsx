import { useMemo } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { EntityLink } from '../PlayerNickname/entity-link';
import styles from '../PlayerNickname/player-nickname.module.scss';

interface StateNameProps {
  readonly name: string;
  readonly href: string;
  readonly color: string;
  readonly description?: string;
  readonly facts?: string;
  readonly onPreview?: () => void;
}
function StateName({
  name,
  href,
  color,
  description,
  facts,
  onPreview,
}: StateNameProps): ReactElement {
  const accent = useMemo<CSSProperties>(() => ({ background: color }), [color]);
  const preview = useMemo(() => ({ title: name, description, facts }), [name, description, facts]);
  return (
    <EntityLink href={href} name={name} preview={preview} onPreview={onPreview}>
      <span className={styles.stateMark} style={accent} aria-hidden="true" />
      <span>{name}</span>
    </EntityLink>
  );
}
export { StateName, type StateNameProps };
