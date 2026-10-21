import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { FxExchangePage } from '../fx/exchange-page';

const route = getRouteApi('/app/exchange/$id');
function Page(): ReactElement {
  return <FxExchangePage id={route.useParams().id} />;
}
const Route = createFileRoute('/app/exchange/$id')({ component: Page });
export { Route };
