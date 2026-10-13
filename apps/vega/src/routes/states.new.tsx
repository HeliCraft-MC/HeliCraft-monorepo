import { createFileRoute, redirect } from '@tanstack/react-router';

const Route = createFileRoute('/states/new')({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: '/app/states/new' });
  },
});
export { Route };
