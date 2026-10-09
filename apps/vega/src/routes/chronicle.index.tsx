import { createFileRoute } from '@tanstack/react-router';
import { ChronicleList } from '../chronicle-list';
import { loadChronicle } from '../chronicle-data';
import { z } from 'zod';
import { metadata } from '../metadata';

export const Route = createFileRoute('/chronicle/')({
  validateSearch: z.object({ page: z.coerce.number().int().positive().default(1) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps }) => await loadChronicle({ data: deps }),
  head: ({ loaderData }) =>
    metadata({
      title: 'Летопись',
      description: 'Истории HeliCraft, сообщество и новости разработки.',
      path: '/chronicle',
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: ChronicleList,
});
