import { PlayerNickname } from '../player-nickname';
import { uiText } from './text';
import { useMemo } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache } from './use-prop-cache';

import { PlayerPicker } from '../player-picker';

import { useTranslation } from '../i18n';

import styles from './states.module.scss';
import type { StateWizardStepProps } from './wizard-types';

function FoundersStep(props: StateWizardStepProps): ReactElement {
  const { step, configuration, onChange, principal, cofounders, setCofounders } = props;
  const { locale } = useTranslation();

  const excludedIds = useMemo(() => [principal.id], [principal.id]);
  const callbackScope = useMemo(
    () => [step, configuration, onChange, principal, cofounders, setCofounders, locale],
    [step, configuration, onChange, principal, cofounders, setCofounders, locale],
  );
  const cachePlayerPickerOnChange =
    usePropCache<NonNullable<ComponentProps<typeof PlayerPicker>['onChange']>>(callbackScope);
  return (
    <section className={styles.editor}>
      <p>
        {uiText(locale, 'Основатель', 'Primary founder')}:{' '}
        <PlayerNickname
          id={principal.id}
          name={principal.username}
          skinId={principal.currentSkinId}
        />
      </p>
      <PlayerPicker
        label={uiText(locale, 'Сооснователи', 'Cofounders')}
        players={cofounders}
        excludedIds={excludedIds}
        onChange={cachePlayerPickerOnChange('9339', (players) => {
          setCofounders(players);
          onChange({ ...configuration, cofounderIds: players.map((player) => player.id) });
        })}
      />
    </section>
  );
}
export { FoundersStep };
