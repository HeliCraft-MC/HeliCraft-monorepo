import { formatDate } from './date-format';
import { useCallback, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { changeUserRoles, changeUserStatus, revokeUserSessions } from '@helicraft/alhena';
import type { Principal, GetUserDetailsResponse } from '@helicraft/alhena';
import { Alert, Button, Select, FormField } from '@helicraft/atria';
import { z } from 'zod';
import { browserClient, errorMessage } from './account-api';
import { useCopyText } from './use-copy-text';
import { RoleCheckbox } from './role-checkbox';
import styles from './account.module.scss';

const StatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'BANNED']);
const availableRoles = ['PLAYER', 'EDITOR', 'MODERATOR', 'ADMIN', 'OWNER'] as const;
interface UserDetailsFormProps {
  readonly user: GetUserDetailsResponse;
  readonly principal: Principal;
  readonly onRefresh: () => Promise<void>;
}
function UserDetailsForm({ user, principal, onRefresh }: UserDetailsFormProps): ReactElement {
  const uuid = user.id;
  const [roles, setRoles] = useState<Principal['roles']>(user.roles);
  const [status, setStatus] = useState<Principal['status']>(user.status);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mutate = useCallback(
    async (action: 'roles' | 'status' | 'sessions'): Promise<void> => {
      setBusy(true);
      setMessage(null);
      try {
        if (action === 'roles') {
          await changeUserRoles({
            client: browserClient(),
            path: { uuid },
            body: { roles },
            throwOnError: true,
          });
        } else if (action === 'status') {
          await changeUserStatus({
            client: browserClient(),
            path: { uuid },
            body: { status },
            throwOnError: true,
          });
        } else {
          await revokeUserSessions({ client: browserClient(), path: { uuid }, throwOnError: true });
        }
        await onRefresh();
        setMessage('Изменения сохранены и записаны в аудит');
      } catch (error) {
        setMessage(errorMessage(error));
      }
      setBusy(false);
    },
    [onRefresh, roles, status, uuid],
  );
  const handleCopy = useCopyText(uuid, setMessage);
  const handleStatusChange = useCallback((event: ChangeEvent<HTMLSelectElement>): void => {
    setStatus(StatusSchema.parse(event.target.value));
  }, []);
  const handleRoleChange = useCallback(
    (role: Principal['roles'][number], checked: boolean): void => {
      setRoles((previous) =>
        checked ? [...previous, role] : previous.filter((item) => item !== role),
      );
    },
    [],
  );
  const handleRoles = useCallback((): void => {
    void mutate('roles');
  }, [mutate]);
  const handleStatus = useCallback((): void => {
    void mutate('status');
  }, [mutate]);
  const handleSessions = useCallback((): void => {
    void mutate('sessions');
  }, [mutate]);
  return (
    <>
      <h1>{user.username ?? 'Пользователь'}</h1>
      <p className={styles.uuid}>{uuid}</p>
      <p className={styles.paragraph}>
        Регистрация: {formatDate(user.createdAt)} · Последний вход: {formatDate(user.lastLoginAt)}
      </p>
      <Button tone="quiet" onClick={handleCopy}>
        Копировать UUID
      </Button>
      {message === null ? null : <Alert>{message}</Alert>}
      <section className={styles.section}>
        <FormField label="Статус" htmlFor="user-status">
          <Select id="user-status" value={status} onChange={handleStatusChange}>
            {StatusSchema.options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </FormField>
        <Button disabled={busy} onClick={handleStatus}>
          Сохранить статус
        </Button>
      </section>
      {principal.permissions.includes('users.roles.manage') ? (
        <section className={styles.section}>
          <h2>Роли</h2>
          {availableRoles.map((role) => (
            <RoleCheckbox
              key={role}
              role={role}
              checked={roles.includes(role)}
              disabled={
                role === 'PLAYER' ||
                (!principal.roles.includes('OWNER') && (role === 'ADMIN' || role === 'OWNER'))
              }
              onChange={handleRoleChange}
            />
          ))}
          <Button disabled={busy} onClick={handleRoles}>
            Сохранить роли
          </Button>
        </section>
      ) : null}
      <Button tone="quiet" disabled={busy} onClick={handleSessions}>
        Завершить все сессии пользователя
      </Button>
      {principal.permissions.includes('audit.read') ? (
        <a href={`/admin/audit?target=${uuid}`}>Аудит действий пользователя</a>
      ) : null}
      <section className={styles.section}>
        <h2>История ников</h2>
        {user.history.length === 0 ? (
          <p>Ник не менялся.</p>
        ) : (
          user.history.map((entry) => (
            <p key={entry.changedAt}>
              {entry.oldUsername} → {entry.newUsername} · {formatDate(entry.changedAt)}
            </p>
          ))
        )}
      </section>
    </>
  );
}
export { UserDetailsForm };
