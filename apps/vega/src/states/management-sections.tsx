// oxlint-disable import/max-dependencies -- State workspace composition combines typed decision evidence, citizen actions and shared controls.
import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { Button, ActionLink } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { OfficeAssignments } from './office-assignments';
import { ManagementMembership } from './management-membership';
import { ManagementHistory } from './management-history';
import { PublicGovernment } from './public-government';
import { StateProposalsPage } from './proposals-page';
import { displayText, uiText } from './text';
import styles from './states.module.scss';

const MANAGEMENT_SECTIONS = [
  'overview',
  'identity',
  'government',
  'constitution',
  'appointments',
  'proposals',
  'citizenship',
  'history',
] as const;
type ManagementSection = (typeof MANAGEMENT_SECTIONS)[number];
function ManagementSections({
  state,
  actorId,
  section,
  onReform,
  pending,
}: Readonly<{
  state: StateDetail;
  actorId: string;
  section: ManagementSection;
  onReform: () => void;
  pending: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const citizen = state.citizens.some((person) => person.id === actorId);
  if (section === 'appointments') {
    return <OfficeAssignments state={state} />;
  }
  if (section === 'proposals') {
    return <StateProposalsPage stateId={state.id} actorId={actorId} />;
  }
  if (section === 'history') {
    return <ManagementHistory stateId={state.id} />;
  }
  if (section === 'citizenship') {
    return citizen ? (
      <ManagementMembership stateId={state.id} />
    ) : (
      <p>
        {uiText(locale, 'У вас нет действующего гражданства.', 'You have no current citizenship.')}
      </p>
    );
  }
  return (
    <section className={styles.editor}>
      {section === 'overview' && (
        <>
          <h2>
            {uiText(locale, 'Добро пожаловать в панель государства', 'Welcome to state management')}
          </h2>
          <p>
            {uiText(
              locale,
              'Здесь собраны ваши действия как гражданина и должностного лица. В меню слева можно открыть предложения и голосования, подготовить изменения, просмотреть историю или управлять своим гражданством.',
              'This panel brings together your actions as a citizen and office holder. Use the menu to review proposals and votes, prepare changes, browse history, or manage your citizenship.',
            )}
          </p>
          <ol>
            <li>
              {uiText(
                locale,
                'Изучите действующие правила и должности.',
                'Review the current rules and offices.',
              )}
            </li>
            <li>
              {uiText(
                locale,
                'Подготовьте проект изменения и отправьте его на рассмотрение.',
                'Prepare a change and submit it for review.',
              )}
            </li>
            <li>
              {uiText(
                locale,
                'Одобрения и голосование проходят по действующей процедуре государства.',
                'Approvals and voting follow the current state procedure.',
              )}
            </li>
          </ol>
          <p>
            {uiText(
              locale,
              'Права определяются действующими должностями и правилами решений. Создание проекта само по себе не меняет государство.',
              'Authority follows current offices and decision rules. Creating a draft does not change the state.',
            )}
          </p>
        </>
      )}
      {section === 'identity' && (
        <>
          <h2>{uiText(locale, 'Название, описание и символы', 'Name, description and symbols')}</h2>
          <p>{displayText(state.configuration.description, locale)}</p>
          <p>
            {uiText(
              locale,
              'Измените название, переводы, описание, цвет и флаги в проекте реформы. Публикация требует одобрения по действующим правилам.',
              'Edit the name, translations, description, color and flags in a reform draft. Publication requires approval under current rules.',
            )}
          </p>
        </>
      )}
      {section === 'government' && (
        <>
          <h2>{uiText(locale, 'Должности и полномочия', 'Offices and authority')}</h2>
          <PublicGovernment state={state} />
          <p>
            {uiText(
              locale,
              'Правила должностей меняются проектом реформы. Действующих держателей назначают и снимают в разделе «Назначения» по отдельной процедуре.',
              'Change office rules through a reform. Appoint and remove current holders in the Appointments section through the separate procedure.',
            )}
          </p>
        </>
      )}
      {section === 'constitution' && (
        <>
          <h2>{uiText(locale, 'Конституция и правила', 'Constitution and rules')}</h2>
          <ActionLink href={`/states/${state.slug}/constitution`}>
            {uiText(locale, 'Читать действующую конституцию', 'Read current constitution')}
          </ActionLink>
          <p>
            {uiText(
              locale,
              'Изменения конституции и государственных правил проходят через проект реформы. Текст документа должен соответствовать правилам принятия решений.',
              'Constitution and governance changes go through a reform proposal. Document text must follow the decision rules.',
            )}
          </p>
        </>
      )}
      {citizen && state.status === 'ACTIVE' && (
        <Button onClick={onReform} disabled={pending}>
          {uiText(locale, 'Подготовить изменение', 'Prepare a change')}
        </Button>
      )}
    </section>
  );
}
export { ManagementSections, MANAGEMENT_SECTIONS, type ManagementSection };
