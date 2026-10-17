import type { ReactElement } from 'react';
import type { OfficeAssignmentDetail } from '@helicraft/alhena';
import { FieldHelp } from '@helicraft/atria';
import { PlayerNickname } from '../player-nickname';
import { useTranslation } from '../i18n';
import { displayText, uiText } from './text';
import { rowKey } from './use-prop-cache';

function OfficeAssignmentApprovals({
  proposal,
}: Readonly<{ proposal: OfficeAssignmentDetail }>): ReactElement {
  const { locale } = useTranslation();
  function officeName(id: string): string {
    return displayText(
      proposal.approvalOffices.find((office) => office.id === id)?.name ?? {},
      locale,
    );
  }
  return (
    <div>
      <h4>
        {uiText(locale, 'Одобрения должностей', 'Office approvals')}{' '}
        <FieldHelp
          label={uiText(locale, 'Одобрения должностей', 'Office approvals')}
          content={uiText(
            locale,
            'Каждая группа требований должна быть выполнена. Подпись учитывается, пока её автор непрерывно занимает указанную должность; после завершения срока или повторного назначения нужно новое одобрение.',
            'Every requirement group must be satisfied. A signature counts while its author continuously holds the specified office; a new approval is needed after the term ends or reappointment.',
          )}
        />
      </h4>
      {proposal.approvalGroups.map((group, index) => (
        <p key={rowKey('group', index, group.officeIds)}>
          {uiText(
            locale,
            group.mode === 'ANY'
              ? 'Нужно одобрение одной из должностей'
              : 'Нужны одобрения всех должностей',
            group.mode === 'ANY' ? 'One office approval required' : 'All office approvals required',
          )}
          : {group.officeIds.map(officeName).join(', ')}
        </p>
      ))}
      {proposal.approvals.length > 0 && (
        <ul>
          {proposal.approvals.map((approval) => (
            <li key={rowKey(approval.officeId, approval.actor.id)}>
              {officeName(approval.officeId)} ·{' '}
              <PlayerNickname id={approval.actor.id} name={approval.actor.name} /> ·{' '}
              {uiText(
                locale,
                approval.current ? 'Одобрение действует' : 'Одобрение утратило силу',
                approval.current ? 'Current approval' : 'Approval no longer valid',
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export { OfficeAssignmentApprovals };
