import { useId } from 'react';
import type { ReactElement } from 'react';
import type { TaxRule } from '@helicraft/alhena';
import { Checkbox, FieldHelp, FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { TAX_EVENTS, taxEventLabel } from './event-labels';

function TaxScopeFields({ rule }: Readonly<{ rule?: TaxRule }>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const events = rule?.events ?? [rule?.event ?? 'PLAYER_TRANSFER'];
  const stored = rule?.jurisdictions.join(',') ?? 'CITIZENSHIP';
  const basis = stored === 'CITIZENSHIP,TERRITORIAL' ? 'BOTH' : stored;
  return (
    <>
      <fieldset>
        <legend>{uiText(locale, 'События', 'Events')}</legend>
        <input type="hidden" name="taxEventsConfigured" value="true" />
        {TAX_EVENTS.map((event) => (
          <Checkbox
            key={event}
            name="events"
            value={event}
            defaultChecked={events.includes(event)}
            label={taxEventLabel(event, locale)}
          />
        ))}
        <FieldHelp
          label={uiText(locale, 'Какие платежи облагаются', 'Which payments are covered')}
          content={uiText(
            locale,
            'Выберите хотя бы одно событие. Антарес определяет событие по юридическим сторонам платежа. Эмиссия, официальные казённые перечисления, FX и сами налоги не являются обычными переводами.',
            'Select at least one event. Antares derives the event from the legal parties. Issuance, official treasury remittances, FX and tax payments are separate operations.',
          )}
        />
      </fieldset>
      <FormField
        label={uiText(locale, 'Налоговая юрисдикция', 'Tax jurisdiction')}
        htmlFor={`${id}-basis`}
        help={uiText(
          locale,
          'Гражданство относится к игроку; регистрация компании — к юридическому лицу. Контекст филиала требует конкретного утверждённого корпоративного решения и действительной регистрации; он не доказывает физическое местоположение.',
          'Citizenship concerns the player; company registration concerns the legal entity. Branch attribution requires the exact approved corporate decision and real registration; it does not establish physical location.',
        )}
      >
        <Select id={`${id}-basis`} name="basis" defaultValue={basis}>
          <option value="CITIZENSHIP">{uiText(locale, 'Гражданство', 'Citizenship')}</option>
          <option value="TERRITORIAL">
            {uiText(
              locale,
              'Территория — временно по гражданству',
              'Territory — temporary citizenship proxy',
            )}
          </option>
          <option value="BOTH">
            {uiText(locale, 'Оба основания игрока — один налог', 'Both player bases — one tax')}
          </option>
          <option value="COMPANY_REGISTRATION">
            {uiText(locale, 'Государство регистрации компании', 'Company registration state')}
          </option>
          <option value="BRANCH_REGISTRATION">
            {uiText(locale, 'Подтверждённая регистрация филиала', 'Verified branch registration')}
          </option>
          <option value="COMPANY_REGISTRATION,BRANCH_REGISTRATION">
            {uiText(
              locale,
              'Регистрация компании или её филиала',
              'Company or branch registration',
            )}
          </option>
          <option value="ALL">
            {uiText(locale, 'Все поддерживаемые основания', 'All supported bases')}
          </option>
          {![
            'CITIZENSHIP',
            'TERRITORIAL',
            'BOTH',
            'COMPANY_REGISTRATION',
            'BRANCH_REGISTRATION',
            'COMPANY_REGISTRATION,BRANCH_REGISTRATION',
          ].includes(basis) && (
            <option value={basis}>
              {uiText(locale, 'Сохранённые основания', 'Saved bases')}: {basis}
            </option>
          )}
        </Select>
      </FormField>
    </>
  );
}
export { TaxScopeFields };
