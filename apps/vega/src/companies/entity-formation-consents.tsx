import type { ReactElement } from 'react';
import type { CompanyDraft } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyOwnerIdentity } from './owner-identity';

function EntityFormationConsents({ draft }: Readonly<{ draft: CompanyDraft }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section>
      <ul>
        {draft.configuration.allocations
          .filter((allocation) => allocation.owner.type !== 'PLAYER')
          .map((allocation) => (
            <li key={`${allocation.owner.type}:${allocation.owner.id}`}>
              <CompanyOwnerIdentity owner={allocation.owner} /> ·{' '}
              <a
                href={
                  allocation.owner.type === 'COMPANY'
                    ? `/app/companies/${allocation.owner.id}?section=subsidiaries&formationDraftId=${draft.id}`
                    : `/app/states/${allocation.owner.id}/manage?section=companies&formationDraftId=${draft.id}`
                }
              >
                {uiText(
                  locale,
                  'Согласие через Governance учредителя',
                  'Consent through founder Governance',
                )}
              </a>
            </li>
          ))}
      </ul>
      <p>
        {uiText(
          locale,
          'Эти ссылки предназначены уполномоченным представителям выбранных юридических лиц. Они не дают заявителю чужих полномочий.',
          'These links are for authorized representatives of the selected legal entities. They do not grant the applicant authority over another entity.',
        )}
      </p>
    </section>
  );
}
export { EntityFormationConsents };
