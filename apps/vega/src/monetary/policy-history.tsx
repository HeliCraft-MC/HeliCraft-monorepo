import type { ReactElement } from 'react';
import type { MonetaryPolicyRevision } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { PolicySummary } from './policy-summary';
import styles from './monetary.module.scss';

function MonetaryPolicyHistory({
  revisions,
  code,
}: Readonly<{ revisions: MonetaryPolicyRevision[]; code: string }>): ReactElement {
  const { text, locale } = useTranslation();
  return (
    <section className={styles.panel}>
      <h3>{text('monetary.policyHistory')}</h3>
      {revisions.length === 0 && <p>{text('monetary.noPolicy')}</p>}
      {revisions.map((revision) => (
        <article className={styles.card} key={revision.id}>
          <h4>
            {text('monetary.policyRevisionNumber')} {revision.number}
          </h4>
          <time dateTime={revision.createdAt}>
            {new Date(revision.createdAt).toLocaleString(locale)}
          </time>
          <PolicySummary policy={revision.limits} code={code} />
          <details>
            <summary>{text('monetary.details')}</summary>
            <p>
              {text('monetary.policyRevision')}: {revision.id}
            </p>
            <p>
              {text('monetary.directiveId')}: {revision.directiveId}
            </p>
          </details>
        </article>
      ))}
    </section>
  );
}
export { MonetaryPolicyHistory };
