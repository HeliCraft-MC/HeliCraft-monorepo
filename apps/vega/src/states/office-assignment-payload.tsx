import { StateName } from '../state-name';
import type { ReactElement } from 'react';
import type { OfficeAssignmentDetail } from '@helicraft/alhena';
import { PlayerNickname } from '../player-nickname';
import { useTranslation } from '../i18n';
import { rowKey } from './use-prop-cache';
import { displayText, uiText } from './text';

function OfficeAssignmentPayload({
  proposal,
}: Readonly<{ proposal: OfficeAssignmentDetail }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <div>
      <StateName
        name={displayText(proposal.state.name, locale)}
        slug={proposal.state.slug}
        href={`/states/${proposal.state.slug}`}
        color={proposal.state.color}
      />
      <h3>
        {uiText(
          locale,
          proposal.kind === 'APPOINT' ? 'Назначение на должность' : 'Снятие с должности',
          proposal.kind === 'APPOINT' ? 'Office appointment' : 'Removal from office',
        )}
        : {displayText(proposal.office.name, locale)}
      </h3>
      <p>
        <PlayerNickname id={proposal.person.id} name={proposal.person.name} />
        {proposal.replacedPerson !== null && (
          <>
            {' '}
            · {uiText(locale, 'вместо', 'replacing')}{' '}
            <PlayerNickname id={proposal.replacedPerson.id} name={proposal.replacedPerson.name} />
          </>
        )}
      </p>
      <p>
        {uiText(locale, 'Предложил', 'Proposed by')}:{' '}
        <PlayerNickname id={proposal.createdBy.id} name={proposal.createdBy.name} />
      </p>
      {proposal.manualRequired && (
        <p>
          {uiText(
            locale,
            'Правила предусматривают ручную проверку администрации с указанием причины.',
            'The rules require a manual administrative review with a reason.',
          )}
        </p>
      )}
      {proposal.manualProcedures.map((text, index) => (
        <p key={rowKey('manual', index, text)}>{displayText(text, locale)}</p>
      ))}
      {proposal.stale && (
        <p>
          {uiText(
            locale,
            'Устройство или состав должности изменились. Требуется новое предложение.',
            'Governance or the office composition changed. A new proposal is required.',
          )}
        </p>
      )}
      {proposal.blockedReason !== null && <p>{proposal.blockedReason}</p>}
    </div>
  );
}
export { OfficeAssignmentPayload };
