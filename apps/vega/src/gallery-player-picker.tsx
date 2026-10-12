import { useCallback, useEffect, useId, useState } from 'react';
import type { ChangeEvent, MouseEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchGalleryPlayers } from '@helicraft/alhena';
import { Alert, Button, FormField, MinecraftAvatar, TextField } from '@helicraft/atria';
import { browserClient } from './account-api';
import { useTranslation } from './i18n';
import styles from './gallery.module.scss';

interface GalleryPlayer {
  readonly id: string;
  readonly name: string;
}
const MAX_PLAYERS = 20;
const SEARCH_DELAY = 250;
function GalleryPlayerPicker({
  players,
  onChange,
  disabled = false,
}: Readonly<{
  players: readonly GalleryPlayer[];
  onChange: (players: GalleryPlayer[]) => void;
  disabled?: boolean;
}>): ReactElement {
  const { text } = useTranslation();
  const id = useId();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input.trim());
    }, SEARCH_DELAY);
    return (): void => {
      clearTimeout(timer);
    };
  }, [input]);
  const valid = /^[A-Za-z0-9_]{2,16}$/u.test(query);
  const search = useQuery({
    queryKey: ['gallery-players', query],
    queryFn: async ({ signal }) => {
      const { data } = await searchGalleryPlayers({
        client: browserClient(),
        query: { query },
        signal,
        throwOnError: true,
      });
      return data.items;
    },
    enabled: valid && !disabled && players.length < MAX_PLAYERS,
    retry: false,
  });
  const change = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setInput(event.currentTarget.value);
  }, []);
  const results = (search.data ?? []).filter(
    (player) => !players.some((selected) => selected.id === player.id),
  );
  const remove = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const playerId = event.currentTarget.value;
      onChange(players.filter((player) => player.id !== playerId));
    },
    [players, onChange],
  );
  const add = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const player = search.data?.find((candidate) => candidate.id === event.currentTarget.value);
      if (
        !player ||
        players.some((selected) => selected.id === player.id) ||
        players.length >= MAX_PLAYERS
      ) {
        return;
      }
      onChange([...players, player]);
      setInput('');
      setQuery('');
    },
    [search.data, players, onChange],
  );
  return (
    <section className={styles.playerPicker}>
      <FormField label={text('gallery.players')} htmlFor={id} hint={text('gallery.playersHint')}>
        <TextField
          id={id}
          type="search"
          value={input}
          onChange={change}
          disabled={disabled || players.length >= MAX_PLAYERS}
          maxLength={16}
          autoComplete="off"
          aria-describedby={`${id}-hint`}
        />
      </FormField>
      <ul className={styles.playerChips} aria-label={text('gallery.playersSelected')}>
        {players.map((player) => (
          <li key={player.id}>
            <MinecraftAvatar
              name={player.name}
              src={`/api/v1/public/players/${player.id}/avatar.png`}
              size={28}
            />
            <span>{player.name}</span>
            <Button
              tone="quiet"
              disabled={disabled}
              aria-label={`${text('common.remove')}: ${player.name}`}
              value={player.id}
              onClick={remove}
            >
              ×
            </Button>
          </li>
        ))}
      </ul>
      {input.trim() === query && valid && players.length < MAX_PLAYERS && (
        <>
          {search.isFetching && <output>{text('common.loading')}</output>}
          {search.isError && <Alert tone="danger">{text('gallery.playersError')}</Alert>}
          {search.isSuccess && results.length === 0 && (
            <output>{text('gallery.playersEmpty')}</output>
          )}
          <ul className={styles.playerResults} aria-label={text('gallery.playersResults')}>
            {results.map((player) => (
              <li key={player.id}>
                <Button
                  tone="quiet"
                  disabled={disabled}
                  aria-label={player.name}
                  value={player.id}
                  onClick={add}
                >
                  <MinecraftAvatar
                    name={player.name}
                    src={`/api/v1/public/players/${player.id}/avatar.png`}
                    size={32}
                  />{' '}
                  {player.name}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
      {players.length >= MAX_PLAYERS && <output>{text('gallery.playersLimit')}</output>}
    </section>
  );
}
export { GalleryPlayerPicker, type GalleryPlayer };
