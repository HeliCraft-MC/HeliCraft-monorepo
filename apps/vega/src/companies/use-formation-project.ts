import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { getCompanyDraft, getCompanyRegistrationApplication } from '@helicraft/alhena';
import type { CompanyDraft } from '@helicraft/alhena';
import { browserClient } from '../account-api';

interface FormationProject {
  draft: CompanyDraft;
  registered: boolean;
}
function useFormationProject(id?: string): UseQueryResult<FormationProject> {
  return useQuery({
    queryKey: ['company-formation-project-draft', id],
    enabled: id !== undefined,
    queryFn: async () => {
      if (id === undefined) {
        throw new Error('Formation project missing');
      }
      const result = await getCompanyDraft({
        client: browserClient(),
        path: { id },
        throwOnError: true,
      });
      const application =
        result.data.submittedApplicationId === null
          ? null
          : await getCompanyRegistrationApplication({
              client: browserClient(),
              path: { id: result.data.submittedApplicationId },
              throwOnError: true,
            });
      return {
        draft: result.data,
        registered:
          application !== null &&
          ['ACTIVE', 'SUSPENDED', 'CLOSED'].includes(application.data.companyStatus),
      };
    },
  });
}
export { useFormationProject };
