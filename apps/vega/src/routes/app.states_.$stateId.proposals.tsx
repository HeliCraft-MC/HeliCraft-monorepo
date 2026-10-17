import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/app/states_/$stateId/proposals')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/app/states/$stateId/manage',
      params,
      search: { section: 'proposals' },
      replace: true,
    });
  },
});
