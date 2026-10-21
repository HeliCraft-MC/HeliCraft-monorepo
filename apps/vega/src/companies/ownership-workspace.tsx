import { useState } from 'react';
import type { ReactElement } from 'react';
import type { CompanyWorkspace } from '@helicraft/alhena';
import { FieldHelp } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyOwnerIdentity } from './owner-identity';
import { MonetaryPagination } from '../monetary/pagination';
import { ShareIssueComposer } from './share-issue-composer';
import { CompanyShareAction } from './company-share-action';

const PAGE_SIZE = 20;
function CompanyOwnershipWorkspace({
  workspace,
  onSaved,
  shareOperationId,
}: Readonly<{
  workspace: CompanyWorkspace;
  onSaved: () => void;
  shareOperationId?: string;
}>): ReactElement {
  const { locale } = useTranslation();
  const [page, setPage] = useState(1);
  return (
    <section>
      <h2>{uiText(locale, 'Собственность и акции', 'Ownership and shares')}</h2>
      <CompanyShareAction workspace={workspace} operationId={shareOperationId} onSaved={onSaved} />
      {workspace.availableActions.includes('ISSUE_SHARES') && (
        <details>
          <summary>
            {uiText(
              locale,
              'Подготовить дополнительный выпуск',
              'Prepare additional share issuance',
            )}
          </summary>
          <ShareIssueComposer
            key={workspace.currentRevisionId}
            workspace={workspace}
            onSaved={onSaved}
          />
        </details>
      )}
      <p>
        {uiText(locale, 'Выпущено акций', 'Issued shares')}: {workspace.issuedShares}
      </p>
      <FieldHelp
        label={uiText(
          locale,
          'Акции не дают доступа к деньгам',
          'Shares do not grant financial access',
        )}
        content={uiText(
          locale,
          'Собственность даёт вес только в соответствующих акционерных процедурах. Финансовые полномочия определяются уставом отдельно.',
          'Ownership supplies weight only in applicable shareholder procedures. Financial authority is separately defined by the charter.',
        )}
      />
      <ul>
        {workspace.shareholders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((position) => (
          <li key={`${position.owner.type}:${position.owner.id}`}>
            <CompanyOwnerIdentity owner={position.owner} />: {position.shares} /{' '}
            {workspace.issuedShares}
          </li>
        ))}
      </ul>
      <MonetaryPagination
        page={page}
        hasMore={page * PAGE_SIZE < workspace.shareholders.length}
        onPage={setPage}
      />
    </section>
  );
}
export { CompanyOwnershipWorkspace };
