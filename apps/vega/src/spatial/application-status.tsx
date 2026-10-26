import type { ReactElement } from 'react';
import type { TerritoryDraft } from '@helicraft/alhena';
import { Alert } from '@helicraft/atria';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';

function TerritoryApplicationStatus({
  draft,
}: Readonly<{ draft: TerritoryDraft }>): ReactElement | null {
  const { locale } = useTranslation();
  const { application } = draft;
  if (!application) {
    return null;
  }
  const statuses = {
    REVIEW: uiText(
      locale,
      'Государственная процедура завершена. Ожидается административная ратификация.',
      'State procedure complete. Awaiting administrative ratification.',
    ),
    APPROVED: uiText(
      locale,
      'Территория ратифицирована и опубликована.',
      'Territory ratified and published.',
    ),
    REJECTED: uiText(
      locale,
      'Администрация отклонила заявку. Подготовьте новый черновик с учётом мотивировки.',
      'Administrators rejected this application. Prepare a new draft addressing the stated reason.',
    ),
  };
  return (
    <Alert tone={application.status === 'REJECTED' ? 'danger' : 'info'}>
      <p>{statuses[application.status]}</p>
      {application.reason !== null && <p>{application.reason}</p>}
      {application.revisionId !== null && (
        <p>
          {uiText(locale, 'Ревизия', 'Revision')}: {application.revisionId}
        </p>
      )}
    </Alert>
  );
}
export { TerritoryApplicationStatus };
