import { Icon, ActionLink } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { useCallback, useState } from 'react';
import type { CarouselPhoto } from '@helicraft/atria';
import type { ReactElement } from 'react';
import type { HomeData } from './home-data';
import { archivePhotos, homePhotos } from './home-data';
import { HomeHero } from './home-hero';
import { HomeWorld } from './home-world';
import { HomeAtlas } from './home-atlas';
import { HomeEconomy } from './home-economy';
import styles from './home.module.scss';

function Home({ data }: Readonly<{ data: HomeData }>): ReactElement {
  const { text, locale } = useTranslation();

  const [activeSrc, setActiveSrc] = useState(homePhotos(data.gallery, locale)[0]?.src);
  const changedPhoto = useCallback((current: CarouselPhoto | undefined): void => {
    setActiveSrc(current?.src);
  }, []);
  const finalName = activeSrc === '/world/forest.webp' ? 'night' : 'forest';
  const photo = homePhotos(data.gallery, locale)[1] ?? archivePhotos[1];
  return (
    <main id="main-content">
      <HomeHero data={data} onPhotoChange={changedPhoto} />
      <div className={styles.page}>
        <HomeWorld />
        {photo && <HomeAtlas photo={photo} />}
        <HomeEconomy />
      </div>
      <section className={styles.final}>
        <img
          src={`/world/${finalName}.webp`}
          srcSet={`/world/${finalName}-small.webp 800w, /world/${finalName}.webp 2560w`}
          sizes="100vw"
          alt=""
          loading="lazy"
          width="2560"
          height="1440"
        />
        <div>
          <h2>
            {text('home.final.title')}
            <br />
            {text('home.final.titleSuffix')}
          </h2>
          <p>
            {text('home.final.description')}
            <br />
            {text('home.final.descriptionSuffix')}
          </p>
          <ActionLink href="/start">
            {text('common.startPlaying')} <Icon name="arrowUpRight" />
          </ActionLink>
        </div>
      </section>
    </main>
  );
}
export { Home };
