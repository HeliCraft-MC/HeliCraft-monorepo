import type { ReactElement } from 'react';
import type { TreatyContent } from '@helicraft/alhena';
import { FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { TAX_EVENTS, taxEventLabel } from '../taxation/event-labels';
import { TaxCategoryField } from '../taxation/category-field';

function TreatyScopeFields({
  firstLabel,
  secondLabel,
  content,
}: Readonly<{ firstLabel: string; secondLabel: string; content?: TreatyContent }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <>
      <FormField
        label={uiText(locale, 'Событие', 'Event')}
        htmlFor="treaty-event"
        help={uiText(
          locale,
          'Событие определяется настоящими юридическими сторонами операции. Договор действует только в выбранной области и при национальных требованиях обеих сторон.',
          'The actual legal parties determine the event. This treaty applies only within the selected scope when both states have national claims.',
        )}
      >
        <Select id="treaty-event" name="event" defaultValue={content?.event ?? 'PLAYER_TRANSFER'}>
          {TAX_EVENTS.map((event) => (
            <option key={event} value={event}>
              {taxEventLabel(event, locale)}
            </option>
          ))}
        </Select>
      </FormField>
      <TaxCategoryField
        name="firstCategory"
        value={content?.categoryMapping?.firstCategory ?? content?.category}
        label={`${firstLabel} · ${uiText(locale, 'категория требований', 'claim category')}`}
      />
      <TaxCategoryField
        name="secondCategory"
        value={content?.categoryMapping?.secondCategory ?? content?.category}
        label={`${secondLabel} · ${uiText(locale, 'категория требований', 'claim category')}`}
      />
    </>
  );
}
export { TreatyScopeFields };
