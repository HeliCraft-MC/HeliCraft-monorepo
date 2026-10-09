import { useMemo } from 'react';
import type { ReactElement } from 'react';
import styles from './primitives.module.scss';

interface MarkdownContentProps {
  readonly html: string;
}
function MarkdownContent({ html }: MarkdownContentProps): ReactElement {
  const markup = useMemo(() => ({ __html: html }), [html]);
  // Only pass HTML produced by Antares' raw-HTML-disabled, rehype-sanitize pipeline.
  // oxlint-disable-next-line react/no-danger -- The only HTML input is the server-sanitized CMS DTO; raw Markdown is never passed here.
  return <div className={styles.markdown} dangerouslySetInnerHTML={markup} />;
}
export { MarkdownContent, type MarkdownContentProps };
