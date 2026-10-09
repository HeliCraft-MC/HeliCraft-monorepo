import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import styles from './primitives.module.scss';

interface AvatarProps {
  readonly name: string;
  readonly src?: string;
}
function Avatar({ name, src }: AvatarProps): ReactElement {
  const [failed, setFailed] = useState(false);
  const handleFailure = useCallback((): void => {
    setFailed(true);
  }, []);
  return src !== undefined && !failed ? (
    <img className={styles.genericAvatar} src={src} alt={name} onError={handleFailure} />
  ) : (
    <span className={styles.genericAvatar} aria-label={name}>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
export { Avatar, type AvatarProps };
