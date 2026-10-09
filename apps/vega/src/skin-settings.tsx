import { getRouteApi, useRouter } from '@tanstack/react-router';
import { lazy, Suspense, useMemo, useCallback, useEffect, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSkin, uploadSkin, resetSkin } from '@helicraft/alhena';
import { Alert, Button, FormField, MinecraftAvatar } from '@helicraft/atria';
import { browserClient, errorMessage } from './account-api';

import styles from './account.module.scss';

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
  const handleChoose = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    const selected = event.target.files?.[0] ?? null;
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
      setMessage('Скин сохранён');
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
      setMessage('Кастомный скин сброшен');
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
  const loadingPreview = useMemo(() => <p>Загрузка просмотра…</p>, []);
  return (
    <>
      <h1>Твой облик</h1>
      <div className={styles.profile}>
        <MinecraftAvatar
          name={principal.username}
          src={skin.data?.avatarUrl ?? `/api/v1/public/players/${principal.id}/avatar.png`}
          size={80}
        />
        <p>{skin.data ? `Текущий скин: ${skin.data.model}` : 'Кастомный скин не установлен'}</p>
      </div>
      {url ? (
        <Suspense fallback={loadingPreview}>
          <Viewer key={url} url={url} model={file ? model : (skin.data?.model ?? 'CLASSIC')} />
        </Suspense>
      ) : null}
      <div className={styles.form}>
        <FormField
          label="PNG-скин"
          htmlFor="skin-file"
          hint="64×64 или 64×32, не больше 2 МиБ. Legacy-скины используют Classic."
        >
          <input
            id="skin-file"
            type="file"
            accept="image/png"
            onChange={handleChoose}
            aria-describedby="skin-file-hint"
          />
        </FormField>
        <FormField label="Модель" htmlFor="skin-model">
          <select id="skin-model" value={model} onChange={handleModel}>
            <option value="CLASSIC">Classic</option>
            <option value="SLIM">Slim</option>
          </select>
        </FormField>
        {message === null ? null : <Alert>{message}</Alert>}
        {skin.isError ? <Alert tone="danger">Не удалось загрузить текущий скин</Alert> : null}
        <div className={styles.navigation}>
          <Button disabled={!file || busy} onClick={handleSave}>
            Сохранить скин
          </Button>
          <Button tone="quiet" disabled={!skin.data || busy} onClick={handleReset}>
            Сбросить скин
          </Button>
        </div>
      </div>
    </>
  );
}
