import type { ReactElement } from 'react';
import { FieldHelp } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import styles from './monetary.module.scss';

import { LimitField } from './limit-field';

function PolicyFields(): ReactElement {
  const { text } = useTranslation();
  return (
    <fieldset className={styles.form}>
      <legend>
        {text('monetary.policy')}{' '}
        <FieldHelp label={text('monetary.policy')} content={text('monetary.policyHelp')} />
      </legend>
      <LimitField
        field="maxSupplyMinor"
        title={text('monetary.maxSupply')}
        help={text('monetary.maxSupplyHelp')}
      />
      <LimitField
        field="maxGrossIssuance30dMinor"
        title={text('monetary.maxGross')}
        help={text('monetary.maxGrossHelp')}
      />
      <LimitField
        field="maxIssuancePerOperationMinor"
        title={text('monetary.maxOperation')}
        help={text('monetary.maxOperationHelp')}
      />
    </fieldset>
  );
}
export { PolicyFields };
