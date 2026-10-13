import { useCallback } from 'react';
import type { ReactElement } from 'react';
import type { StateOffice } from '@helicraft/alhena';
import { Button } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { displayText, uiText } from './text';

function ProposalApproveButton({
  office,
  disabled,
  onApprove,
}: Readonly<{
  office: StateOffice;
  disabled: boolean;
  onApprove: (officeId: string) => void;
}>): ReactElement {
  const { locale } = useTranslation();
  const handleApprove = useCallback((): void => {
    onApprove(office.id);
  }, [onApprove, office.id]);
  return (
    <Button disabled={disabled} onClick={handleApprove}>
      {uiText(locale, 'Одобрить от должности', 'Approve as office')}:{' '}
      {displayText(office.name, locale)}
    </Button>
  );
}
export { ProposalApproveButton };
