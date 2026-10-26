import type { ReactElement } from 'react';
import type { StateDetail } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import styles from './spatial.module.scss';

function TerritoryAccessHelp({
  state,
  onReform,
  pending,
}: Readonly<{
  state: StateDetail;
  onReform: () => void;
  pending: boolean;
}>): ReactElement {
  const { locale } = useTranslation();
  const configured = state.configuration.governance.policies.some(
    (policy) => policy.action === 'CHANGE_TERRITORY',
  );
  let message = uiText(
    locale,
    'В действующем устройстве государства не настроена процедура «Изменение территории». Её можно добавить через реформу:',
    'The current governance has no Change territory procedure. Add it through a reform:',
  );
  if (configured) {
    message = uiText(
      locale,
      'Процедура «Изменение территории» настроена, но у вашего аккаунта сейчас нет полномочия по ней. Проверьте гражданство и действующее назначение на одну из выбранных в процедуре должностей. Название «король» или отметка главы государства сами по себе не выдают полномочий.',
      'The Change territory procedure exists, but your account currently has no authority under it. Check citizenship and your current appointment to an office selected by that procedure. A title or head-of-state designation does not grant authority by itself.',
    );
  }
  if (state.status !== 'ACTIVE') {
    message = uiText(
      locale,
      'Редактор территории доступен действующему государству. Сначала требуется активация государства.',
      'Territory editing is available for an active state. State activation is required first.',
    );
  }
  return (
    <section className={styles.panel}>
      <p>{message}</p>
      {!configured && state.status === 'ACTIVE' ? (
        <ol>
          <li>
            {uiText(
              locale,
              'Откройте реформу → «9. Государственные решения» → «Общие государственные решения».',
              'Open the reform → 9. State decisions → General state decisions.',
            )}
          </li>
          <li>
            {uiText(
              locale,
              'Найдите «Изменение территории» и нажмите «Настроить процедуру».',
              'Find Change territory and press Configure procedure.',
            )}
          </li>
          <li>
            {uiText(
              locale,
              'Если решение должен принимать король, выберите «Одна должность» и отметьте должность короля.',
              'If the monarch should decide, choose Single office and select the monarch’s office.',
            )}
          </li>
          <li>
            {uiText(
              locale,
              'Отправьте реформу на рассмотрение, получите требуемые действующими правилами одобрения и голосования, затем опубликуйте её. Сохранения черновика недостаточно.',
              'Submit the reform, obtain the approvals and votes required by current rules, then publish it. Saving a draft is not sufficient.',
            )}
          </li>
        </ol>
      ) : null}
      <Button onClick={onReform} disabled={pending}>
        {uiText(locale, 'Предложить реформу устройства', 'Propose governance reform')}
      </Button>
      <a href="/map">{uiText(locale, 'Открыть публичную карту', 'Open public map')}</a>
    </section>
  );
}
export { TerritoryAccessHelp };
