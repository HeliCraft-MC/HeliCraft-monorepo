import type { ReactElement } from 'react';
import { useTranslation } from '../i18n';
import styles from './states.module.scss';

const help: Readonly<Record<number, readonly [string, string]>> = {
  1: [
    'Введите хотя бы один перевод названия. Адрес уникален и после создания не меняется; описание и цвет можно изменить новой редакцией.',
    'Provide at least one name translation. The slug is unique and remains stable after creation; description and color can change in a new revision.',
  ],
  2: [
    'Вертикальный баннер и горизонтальный флаг независимы. Узоры добавляются поверх основы в порядке списка; всего доступно шесть слоёв. Горизонтальный флаг также можно загрузить PNG.',
    'Vertical and horizontal flags are independent. Patterns cover the base in list order, with up to six layers. The horizontal flag also supports PNG upload.',
  ],
  3: [
    'Вы уже основной основатель. Сооснователи выбираются из зарегистрированных игроков; все основатели автоматически станут гражданами после создания.',
    'You are the primary founder. Choose cofounders from registered players; all founders automatically become citizens on creation.',
  ],
  4: [
    'Свободное вступление не требует заявки; по заявке нужен приём по вашим правилам; по приглашению игрок приходит по приглашению государства. Запрет нескольких гражданств распространяется на будущий приём.',
    'Open entry does not need an application; applications follow your admission rules; invitation entry requires a state invitation. Restrictions on multiple citizenships apply to future admission.',
  ],
  5: [
    'Шаблон заполняет должности и процедуры, но не является типом полномочий. После выбора все правила можно изменить. Повторный выбор заменяет текущую конфигурацию после подтверждения.',
    'A preset initializes offices and procedures, but does not grant authority by its name. Every rule can be edited afterwards. Replacing a preset requires confirmation.',
  ],
  6: [
    'Добавьте должности, число мест и первоначальных должностных лиц. Глава государства — отдельный признак; реальные полномочия задаются процедурами решений.',
    'Add offices, seat counts and initial holders. Head of state is a separate designation; actual authority comes from decision procedures.',
  ],
  7: [
    'Настройте назначение, срок и действия при вакансии. Если назначает другая должность, выберите её. Срок отсутствия позволяет инициировать преемственность и не снимает человека автоматически.',
    'Configure appointment, term and vacancy procedures. Select the appointing office where applicable. An inactivity threshold permits initiating succession and does not remove a holder automatically.',
  ],
  8: [
    'Укажите, кто принимает и исключает граждан. Эти процедуры особенно важны для гражданства по заявке: должность, несколько должностей или голосование.',
    'Specify who accepts and removes citizens. These procedures are particularly important for applications: one office, several offices or a vote.',
  ],
  9: [
    'Одна должность принимает решение сама; любая из должностей — каждая отдельно; все должности — совместно. Комбинированная процедура требует и должностей, и голосования граждан.',
    'A single office decides alone; any office may decide independently; multiple offices must all agree. A combined procedure requires both office approval and a citizen vote.',
  ],
  10: [
    'Кворум — доля избирателей, которая должна участвовать. Порог — требуемая поддержка. Голосование каждого правила может переопределить эти общие настройки.',
    'Quorum is the share of eligible voters who must participate. Threshold is the required support. Individual decision rules may override these defaults.',
  ],
  11: [
    'Конституция необязательна. Пишите свой текст или вставляйте готовые абзацы. Подстановки всегда читают данные этой редакции, а текст сам по себе не меняет полномочий.',
    'The constitution is optional. Write your own text or insert generated paragraphs. Placeholders always use this revision’s data; text alone does not change authority.',
  ],
  12: [
    'Проверьте имена, флаги, гражданство и все процедуры. Создание отправляет государство на проверку администрации; публично оно появится только после одобрения.',
    'Review names, flags, citizenship and procedures. Creation submits the state for administration review; it becomes public only after approval.',
  ],
};
function StateStepHelp({ step }: Readonly<{ step: number }>): ReactElement | null {
  const { locale } = useTranslation();
  const description = help[step];
  return description === undefined ? null : (
    <p className={styles.hint}>{description[locale === 'ru' ? 0 : 1]}</p>
  );
}
export { StateStepHelp };
