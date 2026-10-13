import { STEPS } from './wizard-steps';
import { uiText, label } from './text';
import { useMemo, useId, useState } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache, rowKey } from './use-prop-cache';
import { getStatePreset } from '@helicraft/alhena';

import { Alert, Button, Dialog } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';

import { useTranslation } from '../i18n';

import styles from './states.module.scss';
import type { StateWizardStepProps } from './wizard-types';

const presets = [
  'AUTOCRACY',
  'CONSTITUTIONAL_MONARCHY',
  'PRESIDENTIAL_REPUBLIC',
  'COUNCIL_REPUBLIC',
  'DIRECT_DEMOCRACY',
  'CUSTOM',
] as const;
type Preset = (typeof presets)[number];

function PresetStep(props: StateWizardStepProps): ReactElement {
  const { step, configuration, onChange, principal, cofounders, setCofounders, onStepChange } =
    props;
  const { locale } = useTranslation();
  const id = useId();
  const [failure, setFailure] = useState<string | null>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  async function apply(selected: Preset): Promise<void> {
    try {
      const { data } = await getStatePreset({
        client: browserClient(),
        path: { preset: selected },
        throwOnError: true,
      });
      onChange((previous) => ({ ...previous, governance: data }));
      setPreset(null);
    } catch (error) {
      setFailure(errorMessage(error));
    }
  }
  function selectPreset(selected: Preset): void {
    if (
      configuration.governance.offices.length > 0 ||
      configuration.governance.policies.length > 0
    ) {
      setPreset(selected);
    } else {
      void apply(selected);
    }
  }
  const callbackScope = useMemo(
    () => [
      step,
      configuration,
      onChange,
      principal,
      cofounders,
      setCofounders,
      locale,
      id,
      failure,
      setFailure,
      preset,
      setPreset,
      onStepChange,
    ],
    [
      step,
      configuration,
      onChange,
      principal,
      cofounders,
      setCofounders,
      locale,
      id,
      failure,
      setFailure,
      preset,
      setPreset,
      onStepChange,
    ],
  );
  const cacheButtonOnClick =
    usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(callbackScope);
  const cacheDialogOnOpenChange =
    usePropCache<NonNullable<ComponentProps<typeof Dialog>['onOpenChange']>>(callbackScope);
  return (
    <section className={styles.editor}>
      <p>
        {uiText(
          locale,
          'Шаблон задаёт начальную структуру. На следующих шагах можно изменить все правила.',
          'A preset initializes the structure. You can edit every rule in the next steps.',
        )}
      </p>
      <div className={styles.grid}>
        {presets.map((item) => (
          <Button
            key={item}
            tone="quiet"
            onClick={cacheButtonOnClick(rowKey('11673', item), () => {
              selectPreset(item);
            })}
          >
            {label(item, locale)}
          </Button>
        ))}
      </div>
      <Button
        onClick={cacheButtonOnClick('11870', () => {
          if (configuration.governance.policies.length === 0) {
            void apply('CUSTOM');
          }
          onStepChange?.(STEPS.OFFICES);
        })}
      >
        {uiText(locale, 'Расширенная настройка', 'Advanced setup')}
      </Button>
      {failure !== null && <Alert tone="danger">{failure}</Alert>}
      <Dialog
        open={preset !== null}
        onOpenChange={cacheDialogOnOpenChange('12284', (open) => {
          if (!open) {
            setPreset(null);
          }
        })}
        title={uiText(locale, 'Заменить настройки?', 'Replace configuration?')}
        closeLabel={uiText(locale, 'Отмена', 'Cancel')}
      >
        <p>
          {uiText(
            locale,
            'Применение шаблона заменит текущие настройки государственного устройства.',
            'Applying a preset will replace the current governance configuration.',
          )}
        </p>
        <Button
          onClick={cacheButtonOnClick('12782', () => {
            if (preset) {
              void apply(preset);
            }
          })}
        >
          {uiText(locale, 'Применить шаблон', 'Apply preset')}
        </Button>
      </Dialog>
    </section>
  );
}
export { PresetStep };
