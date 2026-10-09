import { useCallback, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import styles from './primitives.module.scss';

interface MinecraftAvatarProps {
  readonly src?: string;
  readonly name: string;
  readonly size?: number;
}
function MinecraftAvatar({ src, name, size = 48 }: MinecraftAvatarProps): ReactElement {
  const [failedSource, setFailedSource] = useState<string | undefined>();
  const handleFailure = useCallback((): void => {
    setFailedSource(src);
  }, [src]);
  const sizeStyle = useMemo(() => ({ width: size, height: size }), [size]);
  return src !== undefined && failedSource !== src ? (
    <img
      className={styles.avatar}
      src={src}
      width={size}
      height={size}
      alt={`Аватар ${name}`}
      onError={handleFailure}
    />
  ) : (
    <span
      className={styles.avatarFallback}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- A letter fallback has no image URL but must retain the avatar accessible name.
      role="img"
      aria-label={`Стандартный аватар ${name}`}
      style={sizeStyle}
    >
      {name.slice(0, 1)}
    </span>
  );
}
export { MinecraftAvatar, type MinecraftAvatarProps };
