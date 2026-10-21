import type { ReactElement } from 'react';
import type { CompanyWorkspace } from '@helicraft/alhena';
import type { SelectedPlayer } from '../player-picker';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { CompanyPlayerIdentity } from './player-identity';
import { CompanyOfficeAppointment } from './office-appointment';
import { CompanyOfficeDefinition } from './office-definition';

function CompanyOfficesWorkspace({
  workspace,
  players,
  onSaved,
}: Readonly<{
  workspace: CompanyWorkspace;
  players: readonly SelectedPlayer[];
  onSaved: () => void;
}>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section>
      <h2>
        {uiText(locale, 'Должности и действующие назначения', 'Offices and current appointments')}
      </h2>
      {workspace.content.charter.offices.length === 0 && (
        <p>
          {uiText(
            locale,
            'Должности не учреждены. Полномочия определяются уставом.',
            'No offices have been established. Authority follows the charter.',
          )}
        </p>
      )}
      {workspace.content.charter.offices.map((office) => (
        <section key={office.id}>
          <h3>{displayText(office.name, locale)}</h3>
          <p>{displayText(office.description, locale)}</p>
          <ul>
            {workspace.holders
              .filter((holder) => holder.officeId === office.id)
              .map((holder) => (
                <li key={holder.id}>
                  <CompanyPlayerIdentity id={holder.userId} /> ·{' '}
                  <time dateTime={holder.since}>
                    {new Date(holder.since).toLocaleString(locale)}
                  </time>
                </li>
              ))}
          </ul>
        </section>
      ))}
      {(workspace.availableActions.includes('APPOINT_OFFICE_HOLDER') ||
        workspace.availableActions.includes('REMOVE_OFFICE_HOLDER')) && (
        <CompanyOfficeAppointment workspace={workspace} players={players} onSaved={onSaved} />
      )}
      {(workspace.availableActions.includes('CREATE_OFFICE') ||
        workspace.availableActions.includes('UPDATE_OFFICE')) && (
        <CompanyOfficeDefinition workspace={workspace} onSaved={onSaved} />
      )}
    </section>
  );
}
export { CompanyOfficesWorkspace };
