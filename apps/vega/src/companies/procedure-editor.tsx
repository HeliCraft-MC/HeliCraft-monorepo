import { useCallback, useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyAuthorityProcedure, CompanyOffice } from '@helicraft/alhena';
import { Checkbox, FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { LocalizedInputField } from '../localized-input';
import { VotingRulesEditor } from '../states/voting-rules';
import { uiText } from '../states/text';
import { COMPANY_MECHANISMS } from './charter-model';
import { companyProcedureLabel } from './labels';
import { ProcedureOffices } from './procedure-offices';

function CompanyProcedureEditor({
  value,
  offices,
  defaults,
  onChange,
}: Readonly<{
  value: CompanyAuthorityProcedure;
  offices: readonly CompanyOffice[];
  defaults: NonNullable<CompanyAuthorityProcedure['vote']>;
  onChange: (value: CompanyAuthorityProcedure) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const id = useId();
  const mechanism = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const next = COMPANY_MECHANISMS.find((item) => item === event.currentTarget.value);
      if (next !== undefined) {
        const needsOffices = !['SHAREHOLDER_VOTE', 'MANUAL'].includes(next);
        const selected = value.officeIds.filter((officeId) =>
          offices.some((office) => office.id === officeId),
        );
        onChange({
          ...value,
          mechanism: next,
          officeIds: needsOffices
            ? selected.slice(0, next === 'SINGLE_OFFICE' ? 1 : undefined)
            : [],
        });
      }
    },
    [value, offices, onChange],
  );
  const manual = useCallback(
    (manualProcedure: CompanyAuthorityProcedure['manualProcedure']): void => {
      onChange({ ...value, manualProcedure });
    },
    [value, onChange],
  );
  const toggleVote = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...value, vote: event.currentTarget.checked ? defaults : null });
    },
    [value, defaults, onChange],
  );
  const vote = useCallback(
    (rules: NonNullable<CompanyAuthorityProcedure['vote']>): void => {
      onChange({ ...value, vote: rules });
    },
    [value, onChange],
  );
  const officeIds = useCallback(
    (ids: string[]): void => {
      onChange({ ...value, officeIds: ids });
    },
    [value, onChange],
  );
  return (
    <section>
      <FormField
        htmlFor={id}
        label={uiText(locale, 'Процедура принятия решения', 'Decision procedure')}
        help={uiText(
          locale,
          'Акции дают вес при акционерном голосовании; состав и вес закрепляются при открытии и не меняются после передачи акций. Должности дают только указанные уставом полномочия. Ручная процедура требует проверки администратора.',
          'Shares supply weight in shareholder votes; voters and weights are frozen at opening and survive later share transfers. Offices grant only charter-defined authority. Manual procedures require administrator review.',
        )}
      >
        <Select id={id} value={value.mechanism} onChange={mechanism}>
          {COMPANY_MECHANISMS.map((item) => (
            <option key={item} value={item}>
              {companyProcedureLabel(item, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      {!['SHAREHOLDER_VOTE', 'MANUAL'].includes(value.mechanism) && (
        <ProcedureOffices
          offices={offices}
          value={value.officeIds}
          single={value.mechanism === 'SINGLE_OFFICE'}
          onChange={officeIds}
        />
      )}
      {value.mechanism === 'MANUAL' && (
        <LocalizedInputField
          label={uiText(locale, 'Ручная процедура', 'Manual procedure')}
          value={value.manualProcedure}
          onChange={manual}
          multiline
        />
      )}
      {['SHAREHOLDER_VOTE', 'OFFICE_VOTE', 'COMBINED'].includes(value.mechanism) && (
        <>
          <Checkbox
            label={uiText(locale, 'Отдельные правила голосования', 'Override voting defaults')}
            checked={value.vote !== null}
            onChange={toggleVote}
          />
          {value.vote !== null && <VotingRulesEditor value={value.vote} onChange={vote} />}
        </>
      )}
      {offices.length === 0 && !['SHAREHOLDER_VOTE', 'MANUAL'].includes(value.mechanism) && (
        <p>{uiText(locale, 'Сначала добавьте должность.', 'Add an office first.')}</p>
      )}
    </section>
  );
}
export { CompanyProcedureEditor };
