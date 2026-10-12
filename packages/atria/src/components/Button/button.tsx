import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { Button as Primitive } from '@base-ui/react/button';
import styles from './button.module.scss';

interface ButtonProps extends Primitive.Props {
  readonly tone?: 'primary' | 'quiet';
}
function Button({ tone = 'primary', className, ...props }: ButtonProps): ReactElement {
  const resolveClassName = useCallback(
    (state: Primitive.State): string =>
      [
        styles.button,
        tone === 'primary' ? styles.primary : styles.quiet,
        typeof className === 'function' ? className(state) : className,
      ]
        .filter(Boolean)
        .join(' '),
    [className, tone],
  );
  return <Primitive {...props} className={resolveClassName} />;
}

export { Button, type ButtonProps };
