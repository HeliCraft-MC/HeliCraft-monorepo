import { PlayerNickname } from '../player-nickname';
import { uiText, displayText, label } from './text';
import { EMPTY_FOUNDERS } from './empty';
import type { ReactElement } from 'react';
import type { StateConfiguration, StateDetail, StateOffice } from '@helicraft/alhena';
import { Badge } from '@helicraft/atria';
import { useTranslation } from '../i18n';

import styles from './states.module.scss';

function OfficeSummary({
  office,
  configuration,
  holders,
  founders = EMPTY_FOUNDERS,
}: Readonly<{
  office: StateOffice;
  configuration: StateConfiguration;
  holders?: StateDetail['holders'];
  founders?: StateDetail['founders'];
}>): ReactElement {
  const { locale } = useTranslation();
  const appointing = configuration.governance.offices.find(
    (item) => item.id === office.appointingOfficeId,
  );
  const names =
    holders === undefined
      ? office.initialHolderIds
          .map((id) => founders.find((founder) => founder.id === id))
          .flatMap((founder) => (founder === undefined ? [] : [founder]))
      : holders
          .filter((holder) => holder.officeId === office.id)
          .map((holder) => ({ id: holder.userId, name: holder.name }));
  return (
    <section className={styles.card}>
      <h3>{displayText(office.name, locale)}</h3>
      {office.isHeadOfState && (
        <Badge>{uiText(locale, 'Глава государства', 'Head of state')}</Badge>
      )}
      <p>{displayText(office.description, locale)}</p>
      <p>
        {label(office.appointment, locale)}
        {appointing ? `: ${displayText(appointing.name, locale)}` : ''}
      </p>
      <p>
        {label(office.term, locale)}
        {office.termDays === null ? '' : ` · ${office.termDays} ${uiText(locale, 'дней', 'days')}`}
      </p>
      <p>
        {uiText(locale, 'Вакансия', 'Vacancy')}: {label(office.vacancy, locale)}
      </p>
      {office.inactivityDays !== null && (
        <p>
          {uiText(
            locale,
            'Процедура преемственности может быть инициирована после дней отсутствия',
            'Succession may be initiated after days of inactivity',
          )}
          : {office.inactivityDays}
        </p>
      )}
      <p>
        {uiText(locale, 'Мест', 'Seats')}: {office.maxHolders}
      </p>
      <h4>
        {holders === undefined
          ? uiText(locale, 'Первоначальные должностные лица', 'Initial office holders')
          : uiText(locale, 'Действующие должностные лица', 'Current office holders')}
      </h4>
      {holders !== undefined && names.length === 0 && (
        <p>{uiText(locale, 'Должность пока свободна.', 'This office is currently vacant.')}</p>
      )}
      <ul>
        {names.map((person) => (
          <li key={person.id}>
            <PlayerNickname id={person.id} name={person.name} />
          </li>
        ))}
      </ul>
    </section>
  );
}
export { OfficeSummary };
