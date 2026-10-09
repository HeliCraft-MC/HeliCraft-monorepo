import { getRouteApi } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { AuthPage } from './auth-page';

const route = getRouteApi('/register');
function RegistrationPage(): ReactElement {
  const site = route.useLoaderData();
  return <AuthPage registrationEnabled={site.registrationEnabled} />;
}
export { RegistrationPage };
