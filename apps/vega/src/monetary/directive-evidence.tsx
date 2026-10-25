import type { ReactElement } from 'react';
import type { MonetaryDirective, StateDetail } from '@helicraft/alhena';
import { Icon, FieldHelp } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';

function DirectiveEvidence({
  directive,
  state,
}: Readonly<{ directive: MonetaryDirective; state: StateDetail }>): ReactElement {
  const { text, locale } = useTranslation();
  return (
    <details>
      <summary>
        {text('monetary.requiredOffices')}{' '}
        <FieldHelp
          label={text('monetary.requiredOffices')}
          content={text('monetary.approvalsHelp')}
        />
      </summary>
      {directive.approvalGroups.map((group) => (
        <p key={`${group.mode}-${group.officeIds.join('|')}`}>
          {uiText(
            locale,
            group.mode === 'ALL' ? 'Все должности:' : 'Любая должность:',
            group.mode === 'ALL' ? 'All offices:' : 'Any office:',
          )}{' '}
          {group.officeIds
            .map((officeId) =>
              displayText(
                state.configuration.governance.offices.find((office) => office.id === officeId)
                  ?.name ?? {},
                locale,
              ),
            )
            .join(', ')}
        </p>
      ))}
      <p>
        {text('monetary.governanceRevision')}: {directive.governanceRevisionId}
      </p>
      <p>{directive.payloadHash}</p>
      <ul>
        {directive.approvals.map((approval) => (
          <li key={`${approval.officeId}-${approval.actorId}`}>
            {displayText(
              state.configuration.governance.offices.find(
                (office) => office.id === approval.officeId,
              )?.name ?? {},
              locale,
            )}
            : {approval.current ? <Icon name="check" /> : '—'}
          </li>
        ))}
      </ul>
    </details>
  );
}
export { DirectiveEvidence };
