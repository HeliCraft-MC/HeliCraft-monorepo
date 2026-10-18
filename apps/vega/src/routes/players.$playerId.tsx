import { createFileRoute, getRouteApi, notFound } from '@tanstack/react-router';
import { z } from 'zod';
import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';
import { loadPublicPlayer } from '../player-public-data';
import { PublicPlayerPage } from '../player-public-page';
import { HTTP } from '../http-status';
import { metadata } from '../metadata';
import { uiText } from '../states/text';

const routeApi = getRouteApi('/players/$playerId');
function Page(): ReactElement {
  const { player } = routeApi.useLoaderData();
  return (
    <main id="main-content">
      <PageContainer>{player && <PublicPlayerPage player={player} />}</PageContainer>
    </main>
  );
}
const Route = createFileRoute('/players/$playerId')({
  loader: async ({ params }) => {
    const parsed = z.uuid().safeParse(params.playerId);
    if (!parsed.success) {
      throw notFound();
    }
    const data = await loadPublicPlayer({ data: { id: parsed.data } });
    if (data.status === HTTP.notFound) {
      throw notFound();
    }
    if (!data.player) {
      throw new Error('Player profile unavailable');
    }
    return data;
  },
  head: ({ loaderData, match }) =>
    metadata({
      serverName: loaderData?.site?.serverName,
      locale: match.context.locale,
      title:
        loaderData?.player?.name ??
        uiText(match.context.locale, 'Игрок не найден', 'Player not found'),
      description: loaderData?.player
        ? uiText(
            match.context.locale,
            `Публичный профиль игрока ${loaderData.player.name} на {serverName}.`,
            `Public profile of ${loaderData.player.name} on {serverName}.`,
          )
        : '',
      path: `/players/${match.params.playerId}`,
      origin: loaderData?.site.canonicalOrigin ?? 'http://localhost:5173',
    }),
  component: Page,
});
export { Route };
