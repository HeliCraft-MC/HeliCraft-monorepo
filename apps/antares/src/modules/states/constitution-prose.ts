import type { StateConfiguration, StateDetail, Office, Policy } from './contracts';
import type { Locale } from '../localized-content/contracts';
import { actionName, phrase, localized, escapeMarkdown } from './constitution-language';

interface ConstitutionContext {
  readonly configuration: StateConfiguration;
  readonly founders: StateDetail['founders'];
  readonly locale: Locale;
}
function playerNames(context: Readonly<ConstitutionContext>): string {
  return context.founders
    .map(
      (person) =>
        `[![](/api/v1/public/players/${person.id}/avatar.png) ${escapeMarkdown(person.name)}](/players/${person.id})`,
    )
    .join(', ');
}
function votingProse(
  rules: Readonly<StateConfiguration['governance']['votingDefaults']>,
  locale: Locale,
): string {
  let threshold = `${rules.thresholdPercent}% ${phrase(locale, 'голосов без учёта воздержавшихся', 'of votes excluding abstentions')}`;
  if (rules.thresholdKind === 'SIMPLE_MAJORITY') {
    threshold = phrase(
      locale,
      'более половины голосов без учёта воздержавшихся',
      'more than half of votes excluding abstentions',
    );
  }
  if (rules.thresholdKind === 'ABSOLUTE_MAJORITY') {
    threshold = phrase(
      locale,
      'более половины всех избирателей',
      'more than half of all eligible voters',
    );
  }
  if (rules.thresholdKind === 'UNANIMOUS') {
    threshold = phrase(locale, 'одобрение всех избирателей', 'approval by every eligible voter');
  }
  return phrase(
    locale,
    `Голосование длится ${rules.durationHours} часов. Для кворума необходимо участие не менее ${rules.quorumPercent}% избирателей. Решение принимается, если получено ${threshold}. ${rules.allowAbstain ? 'Избиратель вправе воздержаться.' : 'Воздержание не предусмотрено.'}`,
    `Voting lasts ${rules.durationHours} hours. A quorum requires at least ${rules.quorumPercent}% of eligible voters to participate. A decision requires ${threshold}. ${rules.allowAbstain ? 'Voters may abstain.' : 'Abstention is not available.'}`,
  );
}
// oxlint-disable-next-line max-lines-per-function -- Each appointment, term, vacancy and inactivity setting contributes one document sentence.
function officeProse(office: Readonly<Office>, context: Readonly<ConstitutionContext>): string {
  const { configuration, locale } = context;
  const name = localized(office.name, locale);
  const appointing = configuration.governance.offices.find(
    (item) => item.id === office.appointingOfficeId,
  );
  const appointer = appointing === undefined ? '' : localized(appointing.name, locale);
  const appointment: Record<Office['appointment'], string> = {
    CITIZEN_VOTE: phrase(
      locale,
      'Должностные лица избираются гражданами.',
      'Office holders are elected by citizens.',
    ),
    APPOINTED_BY_OFFICE: phrase(
      locale,
      `Назначение осуществляет должность «${appointer}».`,
      `Appointments are made by the “${appointer}” office.`,
    ),
    COUNCIL_VOTE: phrase(
      locale,
      'Назначение производится советом.',
      'Appointments are made by a council.',
    ),
    MANUAL_PROCEDURE: phrase(
      locale,
      'Назначение производится по ручной процедуре.',
      'Appointments follow a manual procedure.',
    ),
  };
  const term =
    office.term === 'INDEFINITE'
      ? phrase(locale, 'Мандат бессрочный.', 'The term is indefinite.')
      : phrase(
          locale,
          `Срок мандата — ${office.termDays ?? 0} дней.`,
          `The term is ${office.termDays ?? 0} days.`,
        );
  const vacancy: Record<Office['vacancy'], string> = {
    ELECTION: phrase(
      locale,
      'При освобождении должности проводятся выборы.',
      'A vacant office is filled by election.',
    ),
    APPOINTMENT: phrase(
      locale,
      'При освобождении должности производится назначение.',
      'A vacant office is filled by appointment.',
    ),
    COUNCIL: phrase(
      locale,
      'При освобождении должности решение принимает совет.',
      'A council fills a vacant office.',
    ),
    MANUAL: phrase(
      locale,
      'Вакансия разрешается по ручной процедуре.',
      'Vacancies are resolved through a manual procedure.',
    ),
  };
  const description = localized(office.description, locale);
  const head = office.isHeadOfState
    ? phrase(
        locale,
        'Эта должность является главой государства.',
        'This office serves as head of state.',
      )
    : '';
  const inactivity =
    office.inactivityDays === null
      ? ''
      : phrase(
          locale,
          `После ${office.inactivityDays} дней отсутствия может быть инициирована процедура преемственности; автоматическое снятие не производится.`,
          `After ${office.inactivityDays} days of inactivity, succession may be initiated; removal is not automatic.`,
        );
  return `### ${name}\n\n${[description, head, phrase(locale, `Число мест: ${office.maxHolders}.`, `Number of seats: ${office.maxHolders}.`), appointment[office.appointment], term, vacancy[office.vacancy], inactivity].filter(Boolean).join(' ')}`;
}
// oxlint-disable-next-line max-lines-per-function -- The mechanism catalog states the real approval procedure and optional voting rules.
function policyProse(policy: Readonly<Policy>, context: Readonly<ConstitutionContext>): string {
  const { configuration, locale } = context;
  const names = policy.officeIds
    .flatMap((id) => {
      const office = configuration.governance.offices.find((item) => item.id === id);
      return office === undefined ? [] : [localized(office.name, locale)];
    })
    .join(', ');
  const mechanisms: Record<Policy['mechanism'], string> = {
    SINGLE_OFFICE: phrase(
      locale,
      `решение принимает должность «${names}»`,
      `the “${names}” office decides`,
    ),
    ANY_OF_OFFICES: phrase(
      locale,
      `решение вправе принять любая из должностей: ${names}`,
      `any of these offices may decide: ${names}`,
    ),
    MULTIPLE_OFFICES: phrase(
      locale,
      `необходимо согласие всех должностей: ${names}`,
      `all of these offices must agree: ${names}`,
    ),
    CITIZEN_VOTE: phrase(
      locale,
      'решение принимается голосованием граждан',
      'citizens decide by vote',
    ),
    COUNCIL_VOTE: phrase(
      locale,
      `решение принимается голосованием совета из должностей: ${names}`,
      `a council of these offices decides by vote: ${names}`,
    ),
    COMBINED: phrase(
      locale,
      `необходимы решение должностей ${names} и голосование граждан`,
      `approval by offices ${names} and a citizen vote are required`,
    ),
    MANUAL: phrase(
      locale,
      `применяется ручная процедура: ${localized(policy.manualProcedure, locale)}`,
      `a manual procedure applies: ${localized(policy.manualProcedure, locale)}`,
    ),
  };
  const vote = ['CITIZEN_VOTE', 'COUNCIL_VOTE', 'COMBINED'].includes(policy.mechanism)
    ? ` ${votingProse(policy.vote ?? configuration.governance.votingDefaults, locale)}`
    : '';
  return phrase(
    locale,
    `Для действия «${actionName(policy.action, locale)}» ${mechanisms[policy.mechanism]}.${vote}`,
    `For ${actionName(policy.action, locale)}, ${mechanisms[policy.mechanism]}.${vote}`,
  );
}
function citizenshipProse(context: Readonly<ConstitutionContext>): string {
  const { configuration, locale } = context;
  const entries: Record<StateConfiguration['citizenship']['entryMode'], string> = {
    OPEN: phrase(
      locale,
      'Гражданство предоставляется при свободном вступлении.',
      'Citizenship is obtained through open entry.',
    ),
    BY_APPLICATION: phrase(
      locale,
      'Гражданство предоставляется по заявке, рассмотренной в соответствии с действующими правилами государства.',
      'Citizenship is granted by application, considered under the state’s current rules.',
    ),
    BY_INVITATION: phrase(
      locale,
      'Гражданство предоставляется по приглашению.',
      'Citizenship is granted by invitation.',
    ),
  };
  const multiple = configuration.citizenship.allowMultipleCitizenships
    ? phrase(
        locale,
        'Гражданам разрешено одновременно состоять в других государствах.',
        'Citizens may also hold citizenship in other states.',
      )
    : phrase(
        locale,
        'Одновременное гражданство других государств не допускается.',
        'Simultaneous citizenship in other states is not permitted.',
      );
  return `${entries[configuration.citizenship.entryMode]} ${multiple}`;
}
export {
  playerNames,
  votingProse,
  officeProse,
  policyProse,
  citizenshipProse,
  type ConstitutionContext,
};
