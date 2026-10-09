import { useCallback } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { Principal } from '@helicraft/alhena';
import { Checkbox } from '@helicraft/atria';

type Role = Principal['roles'][number];
interface RoleCheckboxProps {
  readonly role: Role;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onChange: (role: Role, checked: boolean) => void;
}
function RoleCheckbox({ role, checked, disabled, onChange }: RoleCheckboxProps): ReactElement {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange(role, event.target.checked);
    },
    [onChange, role],
  );
  return <Checkbox label={role} checked={checked} disabled={disabled} onChange={handleChange} />;
}
export { RoleCheckbox };
