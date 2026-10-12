import { Icon, ActionLink } from '@helicraft/atria';
import { useTranslation } from './i18n';
import type { ReactElement } from 'react';
import type { CarouselPhoto } from '@helicraft/atria';
import styles from './home.module.scss';

function HomeAtlas({ photo }: Readonly<{ photo: CarouselPhoto }>): ReactElement {
  const { text } = useTranslation();

  return (
    <section className={styles.chapter}>
      <div className={styles.sectionHead}>
        <h2>
          {text('home.atlas.title')}
          <br />
          <span>{text('home.atlas.titleSuffix')}</span>
        </h2>
        <p className={styles.note}>{text('home.atlas.description')}</p>
      </div>
      <div className={styles.atlas}>
        <div className={styles.map}>
          <div className={styles.atlasIntro}>
            <h3>{text('home.atlas.panelTitle')}</h3>
            <p>{text('home.atlas.panelDescription')}</p>
            <ActionLink href="/gallery">
              {text('home.atlas.browsePhotos')} <Icon name="arrowUpRight" />
            </ActionLink>
          </div>
        </div>
        <figure className={styles.place}>
          <img
            src={photo.src}
            srcSet={`${photo.small} 800w, ${photo.src} 2560w`}
            sizes="(max-width: 800px) 100vw, 55vw"
            alt={photo.href !== undefined && photo.href !== '' ? photo.alt : text(photo.alt)}
            loading="lazy"
            width="1280"
            height="800"
          />
          <figcaption>
            <h3>
              {photo.href !== undefined && photo.href !== '' ? photo.title : text(photo.title)}
            </h3>
            <p>
              {photo.href !== undefined && photo.href !== ''
                ? photo.place
                : text(photo.place ?? 'home.atlas.photoFallback')}
            </p>
            <ActionLink href={photo.href ?? '/gallery'} tone="quiet">
              {text('home.atlas.openGallery')} <Icon name="arrowUpRight" />
            </ActionLink>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
export { HomeAtlas };
