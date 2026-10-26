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
import { Alert, Button, FormField, Select, LoadingState } from '@helicraft/atria';
import { browserClient, errorMessage } from '../account-api';
import { useTranslation } from '../i18n';
import { displayText, uiText } from '../states/text';
import { economicAuthority } from '../taxation/model';
import { DirectiveCard } from '../monetary/directive-card';
import { DraftMap } from './draft-map';
import styles from './spatial.module.scss';

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
  const { locale } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
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
  const { mutate } = create;
  const newDraft = useCallback(
    (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const worldId = new FormData(event.currentTarget).get('world');
      if (typeof worldId === 'string' && worldId) {
        mutate(worldId);
      }
    },
    [mutate],
  );
  const select = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    setSelected(event.currentTarget.value);
  }, []);
  if (!authorized) {
    return (
      <section className={styles.panel}>
        <p>
          {uiText(
            locale,
            'Редактор доступен при действующем полномочии CHANGE_TERRITORY. Если процедуры нет в устройстве государства, сначала предложите реформу; администрация не назначает её автоматически.',
            'Editing requires current CHANGE_TERRITORY authority. If the state has no such procedure, propose a governance reform first; administrators do not assign it automatically.',
          )}
        </p>
        <Button onClick={onReform} disabled={pending}>
          {uiText(locale, 'Предложить реформу устройства', 'Propose governance reform')}
        </Button>
        <a href="/map">{uiText(locale, 'Открыть публичную карту', 'Open public map')}</a>
      </section>
    );
  }
  if (!query.data) {
    return query.isPending ? (
      <LoadingState label={uiText(locale, 'Загрузка территорий…', 'Loading territories…')} />
    ) : (
      <Alert tone="danger">{errorMessage(query.error)}</Alert>
    );
  }
  const draft = query.data.drafts.find((item) => item.id === selected) ?? query.data.drafts[0];
  const world = query.data.worlds.find((item) => item.id === draft?.worldId);
  return (
    <section className={styles.panel}>
      <p>
        {uiText(
          locale,
          'Черновик → государственная процедура → административная ратификация → официальная карта. До последнего шага Minecraft использует прежние границы.',
          'Draft → state procedure → administrative ratification → official map. Minecraft keeps the previous boundaries until the final step.',
        )}
      </p>
      <form className={styles.controls} onSubmit={newDraft}>
        <FormField
          label={uiText(locale, 'Мир нового черновика', 'World for a new draft')}
          htmlFor="territory-world"
        >
          <Select id="territory-world" name="world" required>
            {query.data.worlds
              .filter((item) => item.dimension === 'minecraft:overworld')
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {displayText(item.name, locale)}
                </option>
              ))}
          </Select>
        </FormField>
        <Button type="submit" disabled={create.isPending || query.data.worlds.length === 0}>
          {uiText(locale, 'Новый территориальный черновик', 'New territory draft')}
        </Button>
      </form>
      {query.data.worlds.length === 0 && (
        <Alert>
          {uiText(
            locale,
            'Администрация ещё не зарегистрировала игровой мир.',
            'Administrators have not registered a game world yet.',
          )}
        </Alert>
      )}
      <div className={styles.toolbar}>
        {query.data.drafts.map((item) => (
          <Button
            key={item.id}
            tone={item.id === draft?.id ? 'primary' : 'quiet'}
            value={item.id}
            onClick={select}
          >
            {new Date(item.updatedAt).toLocaleString(locale)} ·{' '}
            {item.sealedAt === null
              ? uiText(locale, 'Черновик', 'Draft')
              : uiText(locale, 'Отправлен', 'Submitted')}
          </Button>
        ))}
      </div>
      {draft && world && <DraftMap draft={draft} world={world} onSaved={refresh} />}
      {draft && !world && (
        <Alert>
          {uiText(
            locale,
            'Мир этого черновика выведен из эксплуатации. Геометрию нельзя применить к новому миру с тем же именем.',
            'This draft’s world has been retired. Its geometry cannot be applied to another world with the same name.',
          )}
        </Alert>
      )}
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
      {create.error !== null && <Alert tone="danger">{errorMessage(create.error)}</Alert>}
    </section>
  );
}
export { StateTerritoryWorkspace };
