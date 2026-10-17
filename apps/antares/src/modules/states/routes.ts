import { OpenAPIHono } from '@hono/zod-openapi';
import type { Database } from '../../db';
import { officeAssignmentRoutes } from './office-assignment-routes';
import { accountStateRoutes } from './account-routes';
import { publicStateRoutes } from './public-routes';
import { adminStateRoutes } from './admin-routes';

function stateRoutes(db: Database['db'] | undefined, secureCookies: boolean): OpenAPIHono {
  const app = new OpenAPIHono();
  app.route('/', officeAssignmentRoutes(db, secureCookies));
  app.route('/', accountStateRoutes(db, secureCookies));
  app.route('/', publicStateRoutes(db));
  app.route('/', adminStateRoutes(db, secureCookies));
  return app;
}
export { stateRoutes };
