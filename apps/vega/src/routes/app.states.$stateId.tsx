import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/app/states/$stateId')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/app/states/$stateId/manage',
      params,
      search: { section: 'overview' },
      replace: true,
    });
  },
});
