// oxlint-disable import/max-dependencies -- This composition module connects typed platform services and reusable UI; domain logic remains in separate modules.
import { uiText } from './text';
import { STEPS } from './wizard-steps';
import { useMemo, useId, useCallback } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import { usePropCache, rowKey } from './use-prop-cache';

import type { StateOffice } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';

import { useTranslation } from '../i18n';

import { OfficeEditor } from './office-editor';
import { newOffice } from './office-model';

import styles from './states.module.scss';
import type { StateWizardStepProps } from './wizard-types';

function OfficesStep(props: StateWizardStepProps): ReactElement {
  const { step, configuration, onChange, principal, cofounders, setCofounders } = props;
  const { locale } = useTranslation();
  const id = useId();
  const founders = useMemo(
    () => props.holderCandidates ?? [{ id: principal.id, name: principal.username }, ...cofounders],
    [principal.id, principal.username, cofounders, props.holderCandidates],
  );
  const officeChange = useCallback(
    (office: StateOffice): void => {
      onChange({
        ...configuration,
        governance: {
          ...configuration.governance,
          offices: configuration.governance.offices.map((item) =>
            item.id === office.id ? office : item,
          ),
        },
      });
    },
    [configuration, onChange],
  );
  function moveOffice(position: number, direction: number): void {
    const offices = [...configuration.governance.offices];
    const office = offices[position];
    const other = offices[position + direction];
    if (office && other) {
      offices[position] = other;
      offices[position + direction] = office;
      onChange({ ...configuration, governance: { ...configuration.governance, offices } });
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
      founders,
    ],
    [step, configuration, onChange, principal, cofounders, setCofounders, locale, id, founders],
  );
  const cacheButtonOnClick =
    usePropCache<NonNullable<ComponentProps<typeof Button>['onClick']>>(callbackScope);
  const cacheOfficeEditorOnMove =
    usePropCache<NonNullable<ComponentProps<typeof OfficeEditor>['onMove']>>(callbackScope);
  const cacheOfficeEditorOnRemove =
    usePropCache<NonNullable<ComponentProps<typeof OfficeEditor>['onRemove']>>(callbackScope);
  return (
    <section className={styles.editor}>
      {configuration.governance.offices.map((office, position) => (
        <OfficeEditor
          key={office.id}
          office={office}
          existing={props.existingOfficeIds?.includes(office.id) ?? false}
          offices={configuration.governance.offices}
          founders={founders}
          rules={step === STEPS.OFFICE_RULES}
          position={position}
          onChange={officeChange}
          onMove={cacheOfficeEditorOnMove(rowKey('13438', office, position), (direction) => {
            moveOffice(position, direction);
          })}
          onRemove={cacheOfficeEditorOnRemove(rowKey('13539', office, position), () => {
            onChange({
              ...configuration,
              governance: {
                ...configuration.governance,
                offices: configuration.governance.offices.filter((item) => item.id !== office.id),
              },
            });
          })}
        />
      ))}
      {step === STEPS.OFFICES && (
        <Button
          onClick={cacheButtonOnClick('13925', () => {
            onChange({
              ...configuration,
              governance: {
                ...configuration.governance,
                offices: [...configuration.governance.offices, newOffice()],
              },
            });
          })}
        >
          {uiText(locale, 'Добавить должность', 'Add office')}
        </Button>
      )}
    </section>
  );
}
export { OfficesStep };
