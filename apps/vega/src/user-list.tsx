import { uiText } from './states/text';
// oxlint-disable import/max-dependencies -- The existing screen also composes the shared player nickname/head component.
import { PlayerNickname } from './player-nickname';
import { useTranslation } from './i18n';
import { formatDate } from './date-format';
import { CopyUuid } from './copy-uuid';
import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';

import { useQuery } from '@tanstack/react-query';
import { listUsers } from '@helicraft/alhena';
import {
  PageHeader,
  Alert,
  Pagination,
  Table,
  TextField,
  Select,
  FormField,
} from '@helicraft/atria';
import { z } from 'zod';
import { browserClient } from './account-api';
import styles from './account.module.scss';

const PAGE_SIZE = 20;
const Status = z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']);
const Role = z.enum(['PLAYER', 'EDITOR', 'MODERATOR', 'ADMIN', 'OWNER']);
export function UserList(): ReactElement {
  const { text, locale } = useTranslation();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<z.infer<typeof Status> | undefined>();
  const [role, setRole] = useState<z.infer<typeof Role> | undefined>();
  const handleSearch = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    setSearch(event.target.value);
    setPage(1);
  }, []);
  const handleStatus = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setStatus(event.target.value === '' ? undefined : Status.parse(event.target.value));
    setPage(1);
  }, []);
  const handleRole = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setRole(event.target.value === '' ? undefined : Role.parse(event.target.value));
    setPage(1);
  }, []);
  const result = useQuery({
    queryKey: ['users', page, search, status, role],
    queryFn: async () => {
      const { data } = await listUsers({
        client: browserClient(),
        query: { page, pageSize: PAGE_SIZE, search, status, role },
        throwOnError: true,
      });
      return data;
    },
  });
  return (
    <>
      <PageHeader
        title={text('admin.users')}
        description={uiText(
          locale,
          'Найдите игрока по нику или UUID. Фильтры помогают проверить статусы и роли; управление открывается отдельно для каждого аккаунта.',
          'Find a player by name or UUID. Filter by status and role, then open an account to manage it.',
        )}
      />
      <div className={styles.filters}>
        <FormField label={text('users.searchLabel')} htmlFor="user-search">
          <TextField id="user-search" type="search" value={search} onChange={handleSearch} />
        </FormField>
        <FormField label={text('common.status')} htmlFor="user-status">
          <Select id="user-status" value={status ?? ''} onChange={handleStatus}>
            <option value="">{text('users.allStatuses')}</option>
            {Status.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </FormField>
        <FormField label={text('users.role')} htmlFor="user-role">
          <Select id="user-role" value={role ?? ''} onChange={handleRole}>
            <option value="">{text('users.allRoles')}</option>
            {Role.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </FormField>
      </div>
      {result.isError ? <Alert tone="danger">{text('errors.accessDenied')}</Alert> : null}
      <Table>
        <caption>{text('users.registeredAccounts')}</caption>
        <thead>
          <tr>
            <th>{text('users.player')}</th>
            <th>UUID</th>
            <th>{text('common.status')}</th>
            <th>{text('users.roles')}</th>
            <th>{text('users.registration')}</th>
          </tr>
        </thead>
        <tbody>
          {result.data?.items.map((user) => (
            <tr key={user.id}>
              <td>
                <PlayerNickname
                  id={user.id}
                  name={user.username}
                  skinId={user.currentSkinId}
                  size={32}
                />
                <a className={styles.managePlayer} href={`/admin/users/${user.id}`}>
                  {text('users.manage')}
                </a>
              </td>
              <td>
                <CopyUuid uuid={user.id} />
              </td>
              <td>{user.status}</td>
              <td>{user.roles.join(', ')}</td>
              <td>{formatDate(user.createdAt, locale)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      {result.data?.items.length === 0 ? <p>{text('users.empty')}</p> : null}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={result.data?.total ?? 0}
        onPageChange={setPage}
      />
    </>
  );
}
