import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Map,
  Menu,
  Pause,
  Play,
  X,
} from 'lucide-react';
import type { ReactElement } from 'react';

const iconStyle = { verticalAlign: 'middle', flexShrink: 0 } as const;
const icons = {
  arrowDown: ArrowDown,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  arrowUpRight: ArrowUpRight,
  check: Check,
  copy: Copy,
  map: Map,
  menu: Menu,
  pause: Pause,
  play: Play,
  close: X,
};
interface IconProps {
  readonly name: keyof typeof icons;
  readonly size?: number;
}
function Icon({ name, size = 18 }: IconProps): ReactElement {
  const Glyph = icons[name];
  return <Glyph size={size} aria-hidden="true" focusable="false" style={iconStyle} />;
}
export { Icon, type IconProps };
