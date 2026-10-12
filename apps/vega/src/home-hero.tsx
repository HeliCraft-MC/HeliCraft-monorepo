import { useMemo } from 'react';
import { Icon, ActionLink, PhotoCarousel } from '@helicraft/atria';
import { useTranslation } from './i18n';
import type { CarouselPhoto } from '@helicraft/atria';
import type { ReactElement } from 'react';
import type { HomeData } from './home-data';
import { archivePhotos, homePhotos } from './home-data';
import { ServerAddress } from './server-address';
import styles from './home.module.scss';

function HomeHero({
  data,
  onPhotoChange,
}: Readonly<{
  data: HomeData;
  onPhotoChange: (photo: CarouselPhoto | undefined) => void;
}>): ReactElement {
  const { text, locale } = useTranslation();
  const photos = useMemo(
    () =>
      homePhotos(data.gallery, locale).map((photo) =>
        photo.href !== undefined && photo.href !== ''
          ? photo
          : {
              src: photo.src,
              small: photo.small,
              title: text(photo.title),
              alt: text(photo.alt),
              place: text(photo.place ?? ''),
            },
      ),
    [data.gallery, text, locale],
  );
  const fallbackPhotos = useMemo(
    () =>
      archivePhotos.map((photo) => ({
        src: photo.src,
        small: photo.small,
        title: text(photo.title),
        alt: text(photo.alt),
        place: text(photo.place ?? ''),
      })),
    [text],
  );
  const labels = useMemo(
    () => ({
      gallery: text('home.carousel.label'),
      author: text('common.author'),
      resume: text('home.carousel.resume'),
      pause: text('home.carousel.pause'),
      next: text('home.carousel.next'),
    }),
    [text],
  );

  const address = data.site.phase === 'OPEN' ? data.site.minecraftAddress : null;
  return (
    <PhotoCarousel
      photos={photos}
      fallbackPhotos={fallbackPhotos}
      labels={labels}
      onPhotoChange={onPhotoChange}
    >
      <div className={styles.heroText}>
        <h1>
          {text('home.hero.title')}
          <br />
          {text('home.hero.titleSuffix')}
        </h1>
        <p className={styles.intro}>
          {text('home.hero.description')}
          <br />
          {text('home.hero.descriptionSuffix')}
        </p>
        {address !== null && address !== '' && <ServerAddress address={address} />}
        <div className={styles.actions}>
          <ActionLink href="/start">
            {text('common.startPlaying')}
            <Icon name="arrowUpRight" />
          </ActionLink>
          <ActionLink href="#about" tone="quiet">
            {text('home.exploreWorld')} <Icon name="arrowDown" />
          </ActionLink>
        </div>
      </div>
    </PhotoCarousel>
  );
}
export { HomeHero };
