import { createFileRoute } from '@tanstack/react-router';
import { TaxOfficeAdministration } from '../taxation/admin';

const Route = createFileRoute('/admin/tax-offices')({ component: TaxOfficeAdministration });
export { Route };
