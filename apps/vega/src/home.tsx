import type { ReactElement } from 'react';
import { PageContainer } from '@helicraft/atria';
import type { HomeData } from './home-data';
import { HomeHero } from './home-hero';
import { HomeChronicle } from './home-chronicle';
import { HomePaths } from './home-paths';
import { HomeRoles } from './home-roles';
import { HomeMemory } from './home-memory';
import { HomeStart } from './home-start';
import { HomeFaq } from './home-faq';

function Home({ data }: Readonly<{ data: HomeData }>): ReactElement {
  return (
    <main id="main-content">
      <PageContainer>
        <HomeHero data={data} />
        <HomeChronicle data={data} />
        <HomePaths />
        <HomeRoles />
        <HomeMemory />
        <HomeStart data={data} />
        <HomeFaq />
      </PageContainer>
    </main>
  );
}
export { Home };
