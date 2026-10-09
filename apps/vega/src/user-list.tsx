import { formatDate } from './date-format';
import { CopyUuid } from './copy-uuid';
import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';

import { useQuery } from '@tanstack/react-query';
import { listUsers } from '@helicraft/alhena';
import {
  Alert,
  MinecraftAvatar,
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
      <h1>Пользователи</h1>
      <div className={styles.form}>
        <FormField label="Ник или UUID" htmlFor="user-search">
          <TextField id="user-search" type="search" value={search} onChange={handleSearch} />
        </FormField>
        <FormField label="Статус" htmlFor="user-status">
          <Select id="user-status" value={status ?? ''} onChange={handleStatus}>
            <option value="">Все статусы</option>
            {Status.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Роль" htmlFor="user-role">
          <Select id="user-role" value={role ?? ''} onChange={handleRole}>
            <option value="">Все роли</option>
            {Role.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </FormField>
      </div>
      {result.isError ? <Alert tone="danger">Нет доступа или сервис недоступен</Alert> : null}
      <Table>
        <caption>Зарегистрированные аккаунты</caption>
        <thead>
          <tr>
            <th>Игрок</th>
            <th>UUID</th>
            <th>Статус</th>
            <th>Роли</th>
            <th>Регистрация</th>
          </tr>
        </thead>
        <tbody>
          {result.data?.items.map((user) => (
            <tr key={user.id}>
              <td>
                <MinecraftAvatar
                  name={user.username}
                  src={`/api/v1/public/players/${user.id}/avatar.png?v=${user.currentSkinId ?? 'default'}`}
                  size={32}
                />{' '}
                <a href={`/admin/users/${user.id}`}>{user.username}</a>
              </td>
              <td>
                <CopyUuid uuid={user.id} />
              </td>
              <td>{user.status}</td>
              <td>{user.roles.join(', ')}</td>
              <td>{formatDate(user.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      {result.data?.items.length === 0 ? <p>Пользователи не найдены.</p> : null}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={result.data?.total ?? 0}
        onPageChange={setPage}
      />
    </>
  );
}
