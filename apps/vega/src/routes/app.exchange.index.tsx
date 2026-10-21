import { createFileRoute } from '@tanstack/react-router';
import { FxHistoryPage } from '../fx/history';

const Route = createFileRoute('/app/exchange/')({ component: FxHistoryPage });
export { Route };
