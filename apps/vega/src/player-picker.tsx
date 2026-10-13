import { PlayerNickname } from './player-nickname';
import { useCallback, useEffect, useId, useState } from 'react';
import type { ChangeEvent, MouseEvent, ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchPlayers } from '@helicraft/alhena';
import { Alert, Button, FormField, TextField } from '@helicraft/atria';
import { browserClient } from './account-api';
import { useTranslation } from './i18n';
import styles from './gallery.module.scss';

interface SelectedPlayer {
  readonly id: string;
  readonly name: string;
}
const EMPTY_EXCLUDED: readonly string[] = [];
const MAX_PLAYERS = 20;
const SEARCH_DELAY = 250;
function PlayerPicker({
  players,
  onChange,
  disabled = false,
  label,
  excludedIds = EMPTY_EXCLUDED,
}: Readonly<{
  players: readonly SelectedPlayer[];
  onChange: (players: SelectedPlayer[]) => void;
  disabled?: boolean;
  label?: string;
  excludedIds?: readonly string[];
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
    queryKey: ['players', query],
    queryFn: async ({ signal }) => {
      const { data } = await searchPlayers({
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
    (player) =>
      !excludedIds.includes(player.id) && !players.some((selected) => selected.id === player.id),
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
      <FormField
        label={label ?? text('gallery.players')}
        htmlFor={id}
        hint={text('gallery.playersHint')}
      >
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
            <PlayerNickname id={player.id} name={player.name} size={28} />
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
                  <PlayerNickname id={player.id} name={player.name} size={32} linked={false} />
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
export { PlayerPicker, type SelectedPlayer };
