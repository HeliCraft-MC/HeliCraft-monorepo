import type { ReactElement } from 'react';
import styles from './money-amount.module.scss';

import { formatMoneyMinor } from './format';

function MoneyAmount({
  minor,
  code,
  locale,
}: Readonly<{ minor: string; code: string; locale: string }>): ReactElement {
  return (
    <span className={styles.amount}>
      {formatMoneyMinor(minor, locale)} <span>{code}</span>
    </span>
  );
}
export { MoneyAmount };
