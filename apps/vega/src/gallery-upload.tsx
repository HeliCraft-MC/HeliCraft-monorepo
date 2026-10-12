import { GalleryPlayerPicker } from './gallery-player-picker';
import type { GalleryPlayer } from './gallery-player-picker';
import { TranslationFields, OriginalLanguage } from './translation-fields';
import { galleryTranslations } from './gallery-translations';
import { Icon, Alert, Button, FileDropzone, FormField, TextField } from '@helicraft/atria';
import { useTranslation } from './i18n';
import { getRouteApi } from '@tanstack/react-router';
import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, SubmitEvent, ReactElement } from 'react';
import { uploadGalleryImage } from '@helicraft/alhena';
import { browserClient, errorMessage } from './account-api';
import styles from './gallery.module.scss';

const emptyTranslations = {};
const route = getRouteApi('/app');
const MAX_PLAYERS = 20;
const MAX_HEIGHT = 2048;
const WORLD_BOUNDARY = 30_000_000;
const MAX_BYTES = 10_485_760;
// oxlint-disable-next-line max-lines-per-function -- One upload form keeps labels and validation adjacent; coordinates are optional metadata.
function GalleryUpload(): ReactElement {
  const { text, locale } = useTranslation();

  const { principal } = route.useRouteContext();
  const [originalLanguage, setOriginalLanguage] = useState<string>(locale);
  const handleLanguageChange = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setOriginalLanguage(event.target.value);
  }, []);
  const [players, setPlayers] = useState<GalleryPlayer[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(
    (): (() => void) => (): void => {
      if (preview !== null) {
        URL.revokeObjectURL(preview);
      }
    },
    [preview],
  );
  const choose = useCallback((selected: File | null): void => {
    if (
      selected &&
      (!/^image\/(?:png|jpeg|webp)$/u.test(selected.type) || selected.size > MAX_BYTES)
    ) {
      setMessage(
        selected.size > MAX_BYTES ? 'gallery.upload.sizeError' : 'gallery.upload.typeError',
      );
      return;
    }
    setFile(selected);
    setPreview(selected === null ? null : URL.createObjectURL(selected));
    setMessage(null);
  }, []);
  const submit = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      if (!file || busy) {
        return;
      }
      if (file.size > MAX_BYTES) {
        setMessage('gallery.upload.sizeError');
        return;
      }
      const form = new FormData(event.currentTarget);
      const coordinates = [form.get('x'), form.get('y'), form.get('z')];
      if (coordinates.some(Boolean) && !coordinates.every(Boolean)) {
        setMessage('gallery.upload.coordinatesError');
        return;
      }
      const metadata = {
        originalLanguage: form.get('originalLanguage'),
        translations: galleryTranslations(form),
        title: form.get('title'),
        description: form.get('description'),
        alt: form.get('alt'),
        place: form.get('place'),
        location: coordinates.every(Boolean)
          ? {
              x: Number(form.get('x')),
              y: Number(form.get('y')),
              z: Number(form.get('z')),
              dimension: form.get('dimension'),
            }
          : null,
        players: players.map((player) => player.id),
      };
      setBusy(true);
      setMessage(null);
      try {
        const { data } = await uploadGalleryImage({
          client: browserClient(),
          body: { file, metadata: JSON.stringify(metadata) },
          throwOnError: true,
        });
        globalThis.location.assign(`/gallery/${data.id}`);
      } catch (error) {
        setMessage(errorMessage(error));
        setBusy(false);
      }
    },
    [file, busy, players],
  );
  const addSelf = useCallback((): void => {
    setPlayers((current) =>
      current.length >= MAX_PLAYERS || current.some((player) => player.id === principal.id)
        ? current
        : [...current, { id: principal.id, name: principal.username }],
    );
  }, [principal.id, principal.username]);
  const handleSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      void submit(event);
    },
    [submit],
  );
  return (
    <div className={styles.upload}>
      <a href="/gallery">
        <Icon name="arrowLeft" /> {text('navigation.gallery')}
      </a>
      <h1>{text('gallery.upload.title')}</h1>
      <p>{text('gallery.upload.description')}</p>
      <form onSubmit={handleSubmit}>
        <FileDropzone
          id="gallery-file"
          label={text('gallery.upload.file')}
          hint={`${text('files.dropHint')} · ${text('gallery.upload.fileHint')}`}
          accept="image/png,image/jpeg,image/webp"
          file={file}
          onChoose={choose}
          disabled={busy}
        />
        {preview !== null && (
          <img className={styles.preview} src={preview} alt={text('gallery.upload.previewAlt')} />
        )}
        <OriginalLanguage value={originalLanguage} onChange={handleLanguageChange} />
        <TranslationFields
          kind="gallery"
          originalValues={emptyTranslations}
          values={emptyTranslations}
          originalLanguage={originalLanguage}
        />
        <fieldset>
          <legend>{text('gallery.upload.coordinates')}</legend>
          <div className={styles.coordinates}>
            {['x', 'y', 'z'].map((axis) => (
              <FormField key={axis} label={axis.toUpperCase()} htmlFor={`gallery-${axis}`}>
                <TextField
                  id={`gallery-${axis}`}
                  name={axis}
                  type="number"
                  step="1"
                  min={axis === 'y' ? -MAX_HEIGHT : -WORLD_BOUNDARY}
                  max={axis === 'y' ? MAX_HEIGHT : WORLD_BOUNDARY}
                />
              </FormField>
            ))}
          </div>
          <label htmlFor="gallery-dimension">{text('gallery.upload.dimension')}</label>
          <select id="gallery-dimension" name="dimension">
            <option value="overworld">{text('gallery.dimensions.overworld')}</option>
            <option value="nether">{text('gallery.dimensions.nether')}</option>
            <option value="end">{text('gallery.dimensions.end')}</option>
          </select>
        </fieldset>
        <GalleryPlayerPicker players={players} onChange={setPlayers} disabled={busy} />
        <Button
          tone="quiet"
          onClick={addSelf}
          disabled={
            busy ||
            players.length >= MAX_PLAYERS ||
            players.some((player) => player.id === principal.id)
          }
        >
          {text('gallery.upload.self')}
        </Button>
        {message !== null && <Alert tone="danger">{text(message)}</Alert>}
        <Button type="submit" disabled={!file || busy}>
          {busy ? text('gallery.upload.publishing') : text('gallery.upload.publish')}
        </Button>
      </form>
    </div>
  );
}
export { GalleryUpload };
