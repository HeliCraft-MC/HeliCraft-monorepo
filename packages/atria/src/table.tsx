import type { ReactElement, TableHTMLAttributes } from 'react';
import styles from './primitives.module.scss';

function Table(props: TableHTMLAttributes<HTMLTableElement>): ReactElement {
  return (
    <div className={styles.tableScroll}>
      <table {...props} />
    </div>
  );
}
export { Table };
