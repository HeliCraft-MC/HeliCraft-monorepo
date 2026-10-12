import { useTranslation } from './i18n';
import { getRouteApi, useRouter } from '@tanstack/react-router';
import { lazy, Suspense, useMemo, useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSkin, uploadSkin, resetSkin } from '@helicraft/alhena';
import { Alert, Button, FileDropzone, FormField, MinecraftAvatar } from '@helicraft/atria';
import { browserClient, errorMessage } from './account-api';

import styles from './account.module.scss';

const MAX_SKIN_BYTES = 2_097_152;
const route = getRouteApi('/app');

const Viewer = lazy(async () => {
  const module = await import('./skin-viewer');
  return { default: module.SkinPreview };
});
async function skinQuery(): Promise<Awaited<ReturnType<typeof getSkin>>['data']> {
  const { data } = await getSkin({ client: browserClient(), throwOnError: true });
  return data;
}
export function SkinSettings(): ReactElement {
  const { text } = useTranslation();

  const { principal } = route.useRouteContext();
  const router = useRouter();
  const queries = useQueryClient();
  const skin = useQuery({ queryKey: ['skin', principal.id], queryFn: skinQuery });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [model, setModel] = useState<'CLASSIC' | 'SLIM'>('CLASSIC');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(
    (): (() => void) => () => {
      if (preview !== null) {
        URL.revokeObjectURL(preview);
      }
    },
    [preview],
  );
  const handleChoose = useCallback((selected: File | null): void => {
    if (selected && (selected.type !== 'image/png' || selected.size > MAX_SKIN_BYTES)) {
      setMessage('skin.invalidFile');
      return;
    }
    setFile(selected);
    setPreview(selected === null ? null : URL.createObjectURL(selected));
    setMessage(null);
  }, []);
  const handleModel = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    if (event.target.value === 'CLASSIC' || event.target.value === 'SLIM') {
      setModel(event.target.value);
    }
  }, []);
  const save = useCallback(async (): Promise<void> => {
    if (!file) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await uploadSkin({ client: browserClient(), body: { file, model }, throwOnError: true });
      setFile(null);
      setPreview(null);
      await queries.invalidateQueries({ queryKey: ['account'] });
      await skin.refetch();
      await router.invalidate();
      setMessage('skin.saved');
    } catch (error) {
      setMessage(errorMessage(error));
    }
    setBusy(false);
  }, [file, model, skin, router, queries]);
  const reset = useCallback(async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      await resetSkin({ client: browserClient(), throwOnError: true });
      setFile(null);
      setPreview(null);
      await queries.invalidateQueries({ queryKey: ['account'] });
      await skin.refetch();
      await router.invalidate();
      setMessage('skin.resetSuccess');
    } catch (error) {
      setMessage(errorMessage(error));
    }
    setBusy(false);
  }, [skin, router, queries]);
  const handleSave = useCallback((): void => {
    void save();
  }, [save]);
  const handleReset = useCallback((): void => {
    void reset();
  }, [reset]);
  const url = preview ?? skin.data?.skinUrl ?? `/api/v1/public/players/${principal.id}/skin.png`;
  const loadingPreview = useMemo(() => <p>{text('skin.loadingPreview')}</p>, [text]);
  return (
    <>
      <h1>{text('skin.title')}</h1>
      <div className={styles.profile}>
        <MinecraftAvatar
          name={principal.username}
          src={skin.data?.avatarUrl ?? `/api/v1/public/players/${principal.id}/avatar.png`}
          size={80}
        />
        <p>{skin.data ? `${text('skin.currentSkin')}: ${skin.data.model}` : text('skin.notSet')}</p>
      </div>
      {url ? (
        <Suspense fallback={loadingPreview}>
          <Viewer key={url} url={url} model={file ? model : (skin.data?.model ?? 'CLASSIC')} />
        </Suspense>
      ) : null}
      <div className={styles.form}>
        <FileDropzone
          id="skin-file"
          label={text('skin.file')}
          hint={`${text('files.dropHint')} · ${text('skin.fileHint')}`}
          accept="image/png"
          file={file}
          onChoose={handleChoose}
          disabled={busy}
        />
        <FormField label={text('skin.model')} htmlFor="skin-model">
          <select id="skin-model" value={model} onChange={handleModel}>
            <option value="CLASSIC">Classic</option>
            <option value="SLIM">Slim</option>
          </select>
        </FormField>
        {message === null ? null : <Alert>{text(message)}</Alert>}
        {skin.isError ? <Alert tone="danger">{text('skin.loadError')}</Alert> : null}
        <div className={styles.navigation}>
          <Button disabled={!file || busy} onClick={handleSave}>
            {text('skin.save')}
          </Button>
          <Button tone="quiet" disabled={!skin.data || busy} onClick={handleReset}>
            {text('skin.reset')}
          </Button>
        </div>
      </div>
    </>
  );
}
