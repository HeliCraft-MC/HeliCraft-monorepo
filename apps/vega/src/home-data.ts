import type { loadPublicHome } from './public-data';

type HomeData = Awaited<ReturnType<typeof loadPublicHome>>;
export { type HomeData };
