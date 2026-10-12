import { Icon } from '../icon';
import { useCallback, useEffect, useState } from 'react';
import type { ReactElement, ReactNode, SyntheticEvent } from 'react';
import styles from './photo-carousel.module.scss';

interface CarouselPhoto {
  readonly src: string;
  readonly small: string;
  readonly title: string;
  readonly alt: string;
  readonly author?: string;
  readonly place?: string;
  readonly href?: string;
}
interface PhotoCarouselProps {
  readonly photos: readonly CarouselPhoto[];
  readonly labels?: {
    readonly gallery: string;
    readonly author: string;
    readonly resume: string;
    readonly pause: string;
    readonly next: string;
  };
  readonly children: ReactNode;
  readonly fallbackPhotos?: readonly CarouselPhoto[];
  readonly onPhotoChange?: (photo: CarouselPhoto | undefined) => void;
}
const defaultLabels = {
  gallery: 'Мир HeliCraft в фотографиях',
  author: 'Автор',
  resume: 'Продолжить смену фотографий',
  pause: 'Остановить смену фотографий',
  next: 'Следующая фотография',
};
const INTERVAL_MS = 12_000;
const COUNTER_DIGITS = 2;
// oxlint-disable-next-line max-lines-per-function -- Carousel keeps timer cleanup, preload and accessible controls together.
function PhotoCarousel({
  photos,
  labels = defaultLabels,
  children,
  fallbackPhotos,
  onPhotoChange,
}: PhotoCarouselProps): ReactElement {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const displayed = photos.map((photo, index) =>
    failed.has(photo.src) && fallbackPhotos && fallbackPhotos.length > 0
      ? (fallbackPhotos[index % fallbackPhotos.length] ?? photo)
      : photo,
  );
  const current = displayed[active];
  const imageFailed = useCallback((event: SyntheticEvent<HTMLImageElement>): void => {
    const { source } = event.currentTarget.dataset;
    if (source !== undefined) {
      setFailed((previous) => (previous.has(source) ? previous : new Set([...previous, source])));
    }
  }, []);
  useEffect(() => {
    onPhotoChange?.(current);
  }, [current, onPhotoChange]);
  const nextIndex = photos.length > 0 ? (active + 1) % photos.length : 0;
  const next = displayed[nextIndex];
  const toggle = useCallback((): void => {
    setPaused((value) => !value);
  }, []);
  const advance = useCallback((): void => {
    setActive(nextIndex);
  }, [nextIndex]);
  useEffect((): (() => void) => {
    const reduced = globalThis.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined = undefined;
    function synchronize(): void {
      globalThis.clearInterval(timer);
      if (paused || reduced.matches || photos.length <= 1) {
        return;
      }
      timer = globalThis.setInterval(() => {
        if (!document.hidden) {
          setActive((index) => (index + 1) % photos.length);
        }
      }, INTERVAL_MS);
    }
    synchronize();
    reduced.addEventListener('change', synchronize);
    return (): void => {
      globalThis.clearInterval(timer);
      reduced.removeEventListener('change', synchronize);
    };
  }, [paused, photos.length]);
  useEffect(() => {
    if (!next) {
      return;
    }
    const preload = new Image();
    preload.srcset = `${next.small} 800w, ${next.src} 2560w`;
    preload.sizes = '100vw';
    preload.src = next.src;
  }, [next]);
  return (
    <section className={styles.carousel} aria-label={labels.gallery}>
      <div className={styles.images} aria-hidden="true">
        {displayed.map((photo, index) => (
          <img
            key={photos[index]?.href ?? photos[index]?.src}
            data-source={photos[index]?.src}
            onError={imageFailed}
            className={index === active ? styles.active : styles.inactive}
            src={photo.src}
            srcSet={`${photo.small} 800w, ${photo.src} 2560w`}
            sizes="100vw"
            alt=""
            fetchPriority={index === 0 ? 'high' : 'auto'}
            loading={index === 0 || index === nextIndex ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      <div className={styles.overlay} />
      <div className={styles.content}>{children}</div>
      <div className={styles.bottom}>
        <div className={styles.caption}>
          {current?.href !== undefined && current.href !== '' ? (
            <a href={current.href}>
              {current.title} <Icon name="arrowUpRight" />
            </a>
          ) : (
            <span>{current?.title}</span>
          )}
          {current?.author !== undefined && current.author !== '' && (
            <span>
              {labels.author}: {current.author}
            </span>
          )}
          {current?.place !== undefined && current.place !== '' && <span>{current.place}</span>}
        </div>
        <div className={styles.controls}>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={toggle}
                aria-label={paused ? labels.resume : labels.pause}
              >
                {paused ? <Icon name="play" /> : <Icon name="pause" />}
              </button>
              <button type="button" onClick={advance} aria-label={labels.next}>
                {String(active + 1).padStart(COUNTER_DIGITS, '0')} /{' '}
                {String(photos.length).padStart(COUNTER_DIGITS, '0')} <Icon name="arrowRight" />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
export { PhotoCarousel, type CarouselPhoto, type PhotoCarouselProps };
