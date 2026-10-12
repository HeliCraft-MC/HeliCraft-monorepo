import { GalleryPlayerPicker } from './gallery-player-picker';
import type { GalleryPlayer } from './gallery-player-picker';
import { useState, useCallback } from 'react';
import type { ReactElement, SubmitEvent, ChangeEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { updateGalleryMetadata } from '@helicraft/alhena';
import type { GalleryItem } from '@helicraft/alhena';
import { Alert, Button } from '@helicraft/atria';
import { browserClient, currentAccount, errorMessage } from './account-api';
import { TranslationFields, OriginalLanguage } from './translation-fields';
import { galleryTranslations } from './gallery-translations';
import { useTranslation } from './i18n';

function formString(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === 'string' ? value : '';
}
const emptyTranslations = {};
function GalleryMetadataEditor({ item }: Readonly<{ item: GalleryItem }>): ReactElement | null {
  const { text } = useTranslation();
  const account = useQuery({ queryKey: ['account'], queryFn: currentAccount });
  const router = useRouter();
  const [originalLanguage, setOriginalLanguage] = useState(item.originalLanguage ?? 'ru');
  const handleLanguageChange = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setOriginalLanguage(event.target.value);
  }, []);
  const translations = item.translations ?? emptyTranslations;
  const [players, setPlayers] = useState<GalleryPlayer[]>(item.players);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const save = useCallback(
    async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      setBusy(true);
      setMessage(null);
      try {
        await updateGalleryMetadata({
          client: browserClient(),
          path: { id: item.id },
          throwOnError: true,
          body: {
            title: formString(form, 'title'),
            description: formString(form, 'description'),
            alt: formString(form, 'alt'),
            place: formString(form, 'place'),
            originalLanguage: formString(form, 'originalLanguage'),
            translations: { ...item.translations, ...galleryTranslations(form) },
            location: item.location,
            players: players.map((player) => player.id),
          },
        });
        await router.invalidate();
        setMessage('editor.saved');
      } catch (error) {
        setMessage(errorMessage(error));
      }
      setBusy(false);
    },
    [item, router, players],
  );
  const handleSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      void save(event);
    },
    [save],
  );
  if (account.isError || account.data?.id !== item.author.id) {
    return null;
  }

  return (
    <details>
      <summary>{text('gallery.editCaptions')}</summary>
      <form onSubmit={handleSubmit}>
        <OriginalLanguage value={originalLanguage} onChange={handleLanguageChange} />
        <TranslationFields
          kind="gallery"
          originalValues={item}
          values={translations}
          originalLanguage={originalLanguage}
        />
        <GalleryPlayerPicker players={players} onChange={setPlayers} disabled={busy} />
        {message !== null && <Alert>{text(message)}</Alert>}
        <Button type="submit" disabled={busy}>
          {text('common.save')}
        </Button>
      </form>
    </details>
  );
}
export { GalleryMetadataEditor };
