import type { ReactElement } from 'react';
import type { VotingDetail } from '@helicraft/alhena';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { CompanyOwnerIdentity } from './owner-identity';

function EntityVotingLinks({ voting }: Readonly<{ voting: VotingDetail }>): ReactElement | null {
  const { locale } = useTranslation();
  if ((voting.entityVoters?.length ?? 0) === 0) {
    return null;
  }
  return (
    <section>
      <h3>{uiText(locale, 'Избиратели — юридические лица', 'Legal entity voters')}</h3>
      <ul>
        {voting.entityVoters?.map((voter) => (
          <li key={voter.owner.id}>
            <CompanyOwnerIdentity owner={voter.owner} /> · {uiText(locale, 'Вес', 'Weight')}:{' '}
            {voter.weight} ·{' '}
            {voter.hasVoted ? (
              uiText(locale, 'Голос принят', 'Ballot recorded')
            ) : (
              <a
                href={
                  voter.owner.type === 'COMPANY'
                    ? `/app/companies/${voter.owner.id}?section=decisions&votingId=${voting.id}`
                    : `/app/states/${voter.owner.id}/manage?section=companies&votingId=${voting.id}`
                }
              >
                {uiText(
                  locale,
                  'Решение через Governance владельца',
                  'Decide through owner Governance',
                )}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
export { EntityVotingLinks };
