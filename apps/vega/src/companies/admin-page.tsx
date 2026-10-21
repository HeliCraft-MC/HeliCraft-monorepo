import type { ReactElement } from 'react';
import { useTranslation } from '../i18n';
import { uiText } from '../states/text';
import { AdminCompanyDirectory } from './admin-directory';
import { AdminCompanyManualQueue } from './admin-manual-queue';
import { AdminCompanyDetail } from './admin-detail';

function AdminCompaniesPage({
  actorId,
  companyId,
  search,
}: Readonly<{ actorId: string; companyId?: string; search: string }>): ReactElement {
  const { locale } = useTranslation();
  return (
    <section>
      <h1>{uiText(locale, 'Модерация компаний', 'Company administration')}</h1>
      {companyId === undefined ? (
        <>
          <AdminCompanyDirectory key={search} search={search} />
          <AdminCompanyManualQueue />
        </>
      ) : (
        <>
          <a href="/admin/companies">{uiText(locale, 'Вернуться к списку', 'Back to companies')}</a>
          <AdminCompanyDetail id={companyId} actorId={actorId} />
        </>
      )}
    </section>
  );
}
export { AdminCompaniesPage };
