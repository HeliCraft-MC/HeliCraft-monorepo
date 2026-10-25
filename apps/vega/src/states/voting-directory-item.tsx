import type { ReactElement } from 'react';
import type { VotingDetail } from '@helicraft/alhena';
import { ActionLink, Icon } from '@helicraft/atria';
import { VotingHeading } from './voting-heading';
import { VotingDraftEditor } from './voting-draft-editor';
import { useTranslation } from '../i18n';
import { uiText } from './text';
import styles from './states.module.scss';

function VotingDirectoryItem({
  voting,
  admin,
}: Readonly<{ voting: VotingDetail; admin: boolean }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <article className={styles.card}>
      <VotingHeading voting={voting} />
      <div className={styles.actions}>
        <ActionLink
          href={admin ? `/admin/votings?votingId=${voting.id}` : `/app/votings/${voting.id}`}
        >
          {uiText(
            locale,
            admin ? 'Управлять опросом' : 'Открыть голосование',
            admin ? 'Manage poll' : 'Open vote',
          )}
          <Icon name="arrowRight" />
        </ActionLink>
        {admin && voting.status === 'DRAFT' && voting.subject === null && (
          <VotingDraftEditor id={voting.id} input={voting.input} />
        )}
      </div>
    </article>
  );
}
export { VotingDirectoryItem };
