import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { Button as Primitive } from '@base-ui/react/button';

interface ButtonProps extends Primitive.Props {
  readonly tone?: 'primary' | 'quiet';
}
function Button({ tone = 'primary', className, ...props }: ButtonProps): ReactElement {
  const resolveClassName = useCallback(
    (state: Primitive.State): string =>
      [
        'inline-flex items-center justify-center rounded-xl px-5 py-3 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 disabled:opacity-50',
        tone === 'primary'
          ? 'bg-sky-400 text-slate-950 hover:bg-sky-300'
          : 'bg-slate-800 text-slate-100 hover:bg-slate-700',
        typeof className === 'function' ? className(state) : className,
      ]
        .filter(Boolean)
        .join(' '),
    [className, tone],
  );
  return <Primitive {...props} className={resolveClassName} />;
}

export { Button, type ButtonProps };
