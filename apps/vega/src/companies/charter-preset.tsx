import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { CompanyCharter } from '@helicraft/alhena';
import { Button, Dialog, FormField, Select } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { charterPreset } from './charter-model';

function CompanyCharterPreset({
  value,
  actorId,
  onChange,
}: Readonly<{
  value: CompanyCharter;
  actorId: string;
  onChange: (charter: CompanyCharter) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const [selectedPreset, setSelectedPreset] = useState('');
  const [confirmPreset, setConfirmPreset] = useState(false);
  const preset = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setSelectedPreset(event.currentTarget.value);
  }, []);
  const reviewPreset = useCallback((): void => {
    setConfirmPreset(true);
  }, []);
  const applyPreset = useCallback((): void => {
    if (selectedPreset === 'SHAREHOLDERS' || selectedPreset === 'OFFICER') {
      onChange(charterPreset(selectedPreset, value.votingDefaults, actorId));
      setConfirmPreset(false);
    }
  }, [selectedPreset, value.votingDefaults, actorId, onChange]);
  return (
    <section>
      <FormField
        label={uiText(
          locale,
          'Начать с шаблона (заменяет текущий проект)',
          'Start from a preset (replaces current draft)',
        )}
        htmlFor="company-charter-preset"
      >
        <Select id="company-charter-preset" value={selectedPreset} onChange={preset}>
          <option value="">{uiText(locale, 'Выбрать шаблон', 'Choose a preset')}</option>
          <option value="SHAREHOLDERS">
            {uiText(
              locale,
              'Акционерное управление без должностей',
              'Shareholder governance without offices',
            )}
          </option>
          <option value="OFFICER">
            {uiText(
              locale,
              'Один уполномоченный представитель',
              'Single authorized representative',
            )}
          </option>
        </Select>
      </FormField>
      <p>
        {selectedPreset === 'OFFICER'
          ? uiText(
              locale,
              'Представитель принимает решения от имени компании. Учредитель назначается на первую должность.',
              'A representative makes decisions for the company. The founder takes the initial office.',
            )
          : uiText(
              locale,
              'Решения принимаются голосованием акционеров. Должности можно добавить позже.',
              'Shareholders vote on decisions. Offices can be added later.',
            )}
      </p>
      <Button onClick={reviewPreset} disabled={selectedPreset === ''}>
        {uiText(locale, 'Применить шаблон…', 'Apply preset…')}
      </Button>
      <Dialog
        open={confirmPreset}
        onOpenChange={setConfirmPreset}
        title={uiText(locale, 'Заменить настройки управления?', 'Replace governance settings?')}
        closeLabel={uiText(locale, 'Отмена', 'Cancel')}
      >
        <p>
          {uiText(
            locale,
            'Должности и процедуры будут заменены выбранным шаблоном. Название и распределение акций сохранятся. Для изменённых условий понадобятся новые согласия.',
            'Offices and procedures will be replaced by this preset. Identity and share allocations are preserved. Changed terms require fresh consent.',
          )}
        </p>
        <Button onClick={applyPreset}>
          {uiText(locale, 'Заменить настройки', 'Replace settings')}
        </Button>
      </Dialog>
    </section>
  );
}
export { CompanyCharterPreset };
