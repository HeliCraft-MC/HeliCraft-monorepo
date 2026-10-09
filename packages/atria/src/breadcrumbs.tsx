import type { ReactElement } from 'react';
import styles from './primitives.module.scss';

interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}
function Breadcrumbs({ items }: Readonly<{ items: readonly BreadcrumbItem[] }>): ReactElement {
  return (
    <nav aria-label="Хлебные крошки">
      <ol className={styles.breadcrumbs}>
        {items.map((item) => (
          <li key={item.label}>
            {item.href === undefined ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <a href={item.href}>{item.label}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
export { Breadcrumbs, type BreadcrumbItem };
