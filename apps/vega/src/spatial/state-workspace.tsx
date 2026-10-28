// oxlint-disable import/max-dependencies -- State territory composition uses existing state authority and decision controls around the dedicated geometry editor.
import { useCallback, useState } from 'react';
import type { SubmitEvent, MouseEvent, ReactElement } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  createTerritoryDraft,
  listTerritoryDrafts,
  listSpatialWorlds,
  getStateMonetary,
  getPoliticalMap,
} from '@helicraft/alhena';
import type { StateDetail } from '@helicraft/alhena';
import { Alert, Button, FormField, Select, LoadingState, ActionPanel } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { economicAuthority } from '../taxation/model';
import { DirectiveCard } from '../monetary/directive-card';
import { DraftMap } from './draft-map';
import { TerritoryAccessHelp } from './territory-access-help';
import { useDraftNavigation } from './use-draft-navigation';
import { DraftNavigationDialog } from './draft-navigation-dialog';
import { MapPinned } from 'lucide-react';
import styles from './territory-editor.module.scss';

// oxlint-disable-next-line max-lines-per-function -- State workspace composes draft selection, explicit creation and existing Governance decisions.
function StateTerritoryWorkspace({
  state,
  actorId,
  onReform,
  pending,
}: Readonly<{
  state: StateDetail;
  actorId: string;
  onReform: () => void;
  pending: boolean;
}>): ReactElement {
  const { locale, text } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [editorBusy, setEditorBusy] = useState(false);
  const authorized = economicAuthority(state, actorId, 'CHANGE_TERRITORY');
  const query = useQuery({
    queryKey: ['state-territory', state.id, actorId],
    enabled: authorized,
    queryFn: async () => {
      const client = browserClient();
      const [drafts, worlds, monetary] = await Promise.all([
        listTerritoryDrafts({ client, path: { stateId: state.id }, throwOnError: true }),
        listSpatialWorlds({ client, throwOnError: true }),
        getStateMonetary({ client, path: { stateId: state.id }, throwOnError: true }),
      ]);
      return {
        drafts: drafts.data.items,
        worlds: worlds.data.items,
        decisions: monetary.data.directives.filter(
          (item) => item.payload.kind === 'CHANGE_TERRITORY',
        ),
      };
    },
  });
  const { refetch } = query;
  const refresh = useCallback((): void => {
    void refetch();
  }, [refetch]);
  const create = useMutation({
    mutationFn: async (worldId: string) => {
      const current = await getPoliticalMap({
        client: browserClient(),
        path: { id: worldId },
        throwOnError: true,
      });
      const territory = current.data.territories.find((item) => item.stateId === state.id);
      const result = await createTerritoryDraft({
        client: browserClient(),
        path: { stateId: state.id },
        body: {
          worldId,
          geometry: territory?.geometry ?? null,
          reason: {},
          change: territory === undefined ? 'INITIAL' : 'RESHAPE',
        },
        throwOnError: true,
      });
      setSelected(result.data.id);
      await refetch();
    },
  });
  const navigation = useDraftNavigation(editorBusy, setSelected, create.mutate);
  const { create: requestCreate, select: requestSelect } = navigation;
  const newDraft = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const worldId = new FormData(event.currentTarget).get('world');
      if (typeof worldId === 'string' && worldId) {
        requestCreate(worldId);
      }
    },
    [requestCreate],
  );
  const select = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      if (event.currentTarget.value !== (selected ?? query.data?.drafts[0]?.id)) {
        requestSelect(event.currentTarget.value);
      }
    },
    [requestSelect, selected, query.data?.drafts],
  );
  if (!authorized) {
    return <TerritoryAccessHelp state={state} onReform={onReform} pending={pending} />;
  }
  if (!query.data) {
    return query.isPending ? (
      <LoadingState label={uiText(locale, 'Загрузка территорий…', 'Loading territories…')} />
    ) : (
      <Alert tone="danger">{text(errorMessage(query.error))}</Alert>
    );
  }
  const draft = query.data.drafts.find((item) => item.id === selected) ?? query.data.drafts[0];
  const world = query.data.worlds.find((item) => item.id === draft?.worldId);
  const worlds = query.data.worlds.filter((item) => item.dimension === 'minecraft:overworld');
  return (
    <section className={styles.workspace}>
      {draft === undefined && (
        <>
          <p className={styles.muted}>
            {uiText(
              locale,
              'Подготовьте новые границы, обоснуйте изменение и передайте предложение на решение государства. Опубликованная территория изменится только после ратификации администрации.',
              'Prepare new boundaries, explain the change and submit the proposal for a state decision. Published territory changes only after administrative ratification.',
            )}
          </p>
          <ol
            className={styles.publication}
            aria-label={uiText(locale, 'Путь к публикации', 'Path to publication')}
          >
            <li>{uiText(locale, 'Черновик границ', 'Boundary draft')}</li>
            <li>{uiText(locale, 'Решение государства', 'State decision')}</li>
            <li>{uiText(locale, 'Ратификация и публикация', 'Ratification and publication')}</li>
          </ol>
        </>
      )}
      {query.data.drafts.length === 0 && (
        <div className={styles.empty}>
          <MapPinned aria-hidden="true" />
          <h2>{uiText(locale, 'С чего начнутся границы', 'Start with a boundary')}</h2>
          <p className={styles.muted}>
            {uiText(
              locale,
              'Создайте черновик и обведите участок на карте. Если у государства уже есть территория, она станет отправной точкой.',
              'Create a draft and outline an area on the map. Existing territory will be your starting point.',
            )}
          </p>
        </div>
      )}
      <ActionPanel
        key={draft === undefined ? 'first-draft' : 'drafts'}
        title={
          draft === undefined
            ? uiText(locale, 'Подготовить новые границы', 'Prepare new boundaries')
            : uiText(locale, 'Черновики и новые границы', 'Drafts and new boundaries')
        }
        defaultOpen={query.data.drafts.length === 0}
      >
        {query.data.drafts.length > 0 && (
          <section
            className={styles.section}
            aria-label={uiText(locale, 'Территориальные предложения', 'Territory proposals')}
          >
            <h3>{uiText(locale, 'Ваши предложения', 'Your proposals')}</h3>
            <div className={styles.draftList}>
              {query.data.drafts.map((item) => (
                <Button
                  key={item.id}
                  tone={item.id === draft?.id ? 'primary' : 'quiet'}
                  value={item.id}
                  onClick={select}
                  aria-pressed={item.id === draft?.id}
                >
                  <strong>
                    {item.sealedAt === null
                      ? uiText(locale, 'Редактируемый черновик', 'Editable draft')
                      : uiText(locale, 'Отправлен на решение', 'Submitted proposal')}
                  </strong>
                  <small>{new Date(item.updatedAt).toLocaleString(locale)}</small>
                </Button>
              ))}
            </div>
          </section>
        )}
        <form className={styles.coordinates} onSubmit={newDraft}>
          <FormField
            label={uiText(locale, 'Мир нового черновика', 'World for a new draft')}
            htmlFor="territory-world"
          >
            <Select id="territory-world" name="world" required>
              {worlds.map((item) => (
                <option key={item.id} value={item.id}>
                  {displayText(item.name, locale)}
                </option>
              ))}
            </Select>
          </FormField>
          <Button type="submit" disabled={create.isPending || worlds.length === 0}>
            {uiText(locale, 'Новый территориальный черновик', 'New territory draft')}
          </Button>
        </form>
        {worlds.length === 0 && (
          <Alert>
            {uiText(
              locale,
              'Игровой мир ещё не подключён. Он появится автоматически после запуска Minecraft-сервера.',
              'The game world is not connected yet. It will appear automatically when Minecraft starts.',
            )}
          </Alert>
        )}
      </ActionPanel>
      {draft && world && (
        <DraftMap draft={draft} world={world} onSaved={refresh} onEditingChange={setEditorBusy} />
      )}
      {draft && !world && (
        <Alert>
          {uiText(
            locale,
            'Мир этого черновика выведен из эксплуатации. Геометрию нельзя применить к новому миру с тем же именем.',
            'This draft’s world has been retired. Its geometry cannot be applied to another world with the same name.',
          )}
        </Alert>
      )}
      {query.data.decisions.length > 0 && (
        <section className={styles.section}>
          <h3>{uiText(locale, 'Государственные решения', 'State decisions')}</h3>
          {query.data.decisions.map((directive) => (
            <DirectiveCard
              key={directive.id}
              directive={directive}
              state={state}
              actorId={actorId}
              code=""
              onSaved={refresh}
            />
          ))}
        </section>
      )}
      <DraftNavigationDialog navigation={navigation} />
      {create.error !== null && <Alert tone="danger">{text(errorMessage(create.error))}</Alert>}
    </section>
  );
}
export { StateTerritoryWorkspace };
