import { createFileRoute } from '@tanstack/react-router';
import { BankAdministration } from '../monetary/admin';

const Route = createFileRoute('/admin/central-banks')({ component: BankAdministration });
export { Route };
