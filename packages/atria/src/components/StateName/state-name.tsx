import { useMemo } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { EntityLink } from '../PlayerNickname/entity-link';
import styles from '../PlayerNickname/player-nickname.module.scss';

interface StateNameProps {
  readonly name: string;
  readonly linked?: boolean;
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
  linked = true,
}: StateNameProps): ReactElement {
  const accent = useMemo<CSSProperties>(() => ({ background: color }), [color]);
  const preview = useMemo(() => ({ title: name, description, facts }), [name, description, facts]);
  const content = (
    <>
      <span className={styles.stateMark} style={accent} aria-hidden="true" />
      <span>{name}</span>
    </>
  );
  if (!linked) {
    return <span className={styles.nickname}>{content}</span>;
  }
  return (
    <EntityLink href={href} name={name} preview={preview} onPreview={onPreview}>
      {content}
    </EntityLink>
  );
}
export { StateName, type StateNameProps };
