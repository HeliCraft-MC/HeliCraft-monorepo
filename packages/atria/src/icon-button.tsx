import type { ReactElement } from 'react';
import { Button } from './button';
import type { ButtonProps } from './button';

interface IconButtonProps extends ButtonProps {
  readonly label: string;
}
function IconButton({ label, ...props }: IconButtonProps): ReactElement {
  return <Button {...props} aria-label={label} />;
}
export { IconButton, type IconButtonProps };
