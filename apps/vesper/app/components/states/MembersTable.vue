<script setup lang="ts">
import { computed } from 'vue';
import { RolesInState } from '~/types/state.types';
import type { IStateMember } from '~/types/state.types';
import type { ICity } from '~/types/city.types';               // ⇐ NEW

const props = defineProps<{
  members: (IStateMember & { nickname?: string })[];
  currentUserRole: RolesInState | null;
  updatingMemberUuid: string | null;
  cities: ICity[];                                             // ⇐ NEW
}>();

const emit = defineEmits(['action']);

/* ───── Переводы ролей и стили ───── */
const roleTranslations: Record<RolesInState, string> = {
  [RolesInState.RULER]     : 'Правитель',
  [RolesInState.VICE_RULER]: 'Зам. Правителя',
  [RolesInState.MINISTER]  : 'Министр',
  [RolesInState.DIPLOMAT]  : 'Дипломат',
  [RolesInState.OFFICER]   : 'Офицер',
  [RolesInState.CITIZEN]   : 'Гражданин',
  [RolesInState.APPLICANT] : 'Кандидат'
};

const roleColors: Record<RolesInState, string> = {
  [RolesInState.RULER]     : '#FFD700',
  [RolesInState.VICE_RULER]: '#C0C0C0',
  [RolesInState.MINISTER]  : '#6495ED',
  [RolesInState.DIPLOMAT]  : '#90EE90',
  [RolesInState.OFFICER]   : '#FFA07A',
  [RolesInState.CITIZEN]   : '#E0E0E0',
  [RolesInState.APPLICANT] : '#A9A9A9'
};

const rolePowerLevels: Record<RolesInState, number> = {
  [RolesInState.RULER]     : 5,
  [RolesInState.VICE_RULER]: 4,
  [RolesInState.MINISTER]  : 3,
  [RolesInState.DIPLOMAT]  : 2,
  [RolesInState.OFFICER]   : 1,
  [RolesInState.CITIZEN]   : 0,
  [RolesInState.APPLICANT] : -1
};

/* ───── Доступные роли (для селектора) ───── */
const availableRoles = computed(() => {
  const r = { ...roleTranslations };
  // @ts-expect-error
  delete r[RolesInState.APPLICANT];
  return r;
});
const isApplicantTable = computed(() =>
    props.members.every((m) => m.role === RolesInState.APPLICANT)
);

/* ───── Логика прав доступа ───── */
function getRoleLevel(role: RolesInState | null): number {
  return role ? rolePowerLevels[role] : -1;
}

function canChangeRole(memberRole: RolesInState): boolean {
  if (memberRole === RolesInState.APPLICANT) return false;
  const currentUserLevel = getRoleLevel(props.currentUserRole);
  const memberLevel      = getRoleLevel(memberRole);
  return currentUserLevel > memberLevel;
}

function canKick(memberRole: RolesInState): boolean {
  if (memberRole === RolesInState.APPLICANT) return false;
  const currentUserLevel = getRoleLevel(props.currentUserRole);
  const memberLevel      = getRoleLevel(memberRole);
  return currentUserLevel > memberLevel;
}

/* прав на изменение города достаточно уровня ≥ MINISTER (3) */
function canChangeCity(): boolean {                             // ⇐ NEW
  return getRoleLevel(props.currentUserRole) >= 3;
}

/* нельзя назначать город, если у пользователя нет прав */
function isRoleOptionDisabled(roleToAssign: RolesInState): boolean {
  if (
      roleToAssign === RolesInState.RULER ||
      roleToAssign === RolesInState.APPLICANT
  ) {
    return true;
  }
  const currentUserLevel = getRoleLevel(props.currentUserRole);
  const roleToAssignLevel = getRoleLevel(roleToAssign);
  return roleToAssignLevel >= currentUserLevel;
}

/* ───── Методы ───── */
function emitAction(
    type: 'accept' | 'reject' | 'kick' | 'changeRole' | 'changeCity',
    member: IStateMember,
    payload?: RolesInState | string | null
) {
  if (type === 'changeRole' && payload) {
    emit('action', { type, member, newRole: payload });
  } else if (type === 'changeCity') {
    emit('action', { type, member, newCityUuid: payload as string | null });
  } else {
    emit('action', { type, member });
  }
}

/* ───── Сортированный список городов для селектора ───── */     // ⇐ NEW
const cityOptions = computed(() =>
    [...props.cities].sort((a, b) => a.name.localeCompare(b.name))
);
</script>

<template>
  <div
      class="overflow-x-auto bg-gray-900/50 rounded-lg border border-gray-800"
  >
    <table class="min-w-full divide-y divide-gray-700">
      <thead>
      <tr>
        <th class="table-header">Игрок</th>
        <th class="table-header">Город</th>                <!-- ⇐ NEW -->
        <th class="table-header">Роль</th>
        <th class="table-header text-right">Действия</th>
      </tr>
      </thead>

      <tbody class="divide-y divide-gray-800">
      <tr v-if="members.length === 0">
        <td colspan="4" class="p-8 text-center text-gray-500">
          {{
            isApplicantTable
                ? 'Нет новых заявок'
                : 'В государстве пока нет граждан'
          }}
        </td>
      </tr>

      <tr
          v-for="member in members"
          :key="member.player_uuid"
          class="hover:bg-gray-800/50"
      >
        <!-- ─── Игрок ─── -->
        <td class="table-cell">
          <div class="flex items-center gap-3">
            <img
                :src="`/distant-api/user/${member.nickname}/skin/head`"
                alt="head"
                class="w-10 h-10 rounded-md bg-gray-700 object-cover"
            />
            <span class="font-medium">{{ member.nickname }}</span>
          </div>
        </td>

        <!-- ─── Город ─── -->                              <!-- ⇐ NEW -->
        <td class="table-cell">
          <div v-if="updatingMemberUuid === member.player_uuid && canChangeCity()" class="flex items-center">
            <div class="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-neutral-400 mr-2"></div>
            <span class="text-sm text-gray-400">Обновление...</span>
          </div>

          <template v-else>
            <div v-if="canChangeCity()" class="relative">
              <select
                  :value="member.city_uuid || ''"
                  @change="
                    emitAction(
                      'changeCity',
                      member,
                      ($event.target as HTMLSelectElement).value || null
                    )
                  "
                  class="city-select"
              >
                <option value="">— Без города —</option>
                <option
                    v-for="city in cityOptions"
                    :key="city.uuid"
                    :value="city.uuid"
                >
                  {{ city.name }}{{ city.is_capital ? ' (столица)' : '' }}
                </option>
              </select>
              <Icon
                  name="material-symbols:arrow-drop-down-rounded"
                  class="role-select-icon"
              />
            </div>
            <span v-else>
                {{
                member.city_uuid
                    ? cityOptions.find((c) => c.uuid === member.city_uuid)?.name ||
                    'Неизвестно'
                    : '—'
              }}
              </span>
          </template>
        </td>

        <!-- ─── Роль ─── -->
        <td class="table-cell">
          <div
              v-if="updatingMemberUuid === member.player_uuid"
              class="flex items-center"
          >
            <div
                class="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-neutral-400 mr-2"
            ></div>
            <span class="text-sm text-gray-400">Обновление...</span>
          </div>

          <div v-else class="relative">
            <select
                :value="member.role"
                @change="
                  emitAction(
                    'changeRole',
                    member,
                    ($event.target as HTMLSelectElement)
                      .value as RolesInState
                  )
                "
                :disabled="!canChangeRole(member.role)"
                class="role-select"
                :style="{ color: roleColors[member.role] || '#ffffff' }"
            >
              <option
                  v-for="(name, roleKey) in availableRoles"
                  :key="roleKey"
                  :value="roleKey"
                  :disabled="isRoleOptionDisabled(roleKey as RolesInState)"
              >
                {{ name }}
              </option>
            </select>
            <Icon
                name="material-symbols:arrow-drop-down-rounded"
                class="role-select-icon"
            />
          </div>
        </td>

        <!-- ─── Действия ─── -->
        <td class="table-cell text-right">
          <div
              v-if="updatingMemberUuid === member.player_uuid"
              class="h-[30px]"
          ></div>

          <!-- Действия для заявок -->
          <div
              v-else-if="member.role === RolesInState.APPLICANT"
              class="flex justify-end gap-2"
          >
            <button
                @click="emitAction('accept', member)"
                class="action-button-success"
            >
              <Icon name="material-symbols:check-circle-outline-rounded" />
              <span>Принять</span>
            </button>
            <button
                @click="emitAction('reject', member)"
                class="action-button-danger"
            >
              <Icon name="material-symbols:cancel-outline-rounded" />
              <span>Отклонить</span>
            </button>
          </div>

          <!-- Действия для граждан -->
          <div v-else class="flex justify-end">
            <button
                @click="emitAction('kick', member)"
                class="action-button-danger"
                :disabled="!canKick(member.role)"
            >
              <Icon name="material-symbols:person-remove-outline-rounded" />
              <span>Исключить</span>
            </button>
          </div>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-header {
  @apply px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider;
}
.table-cell {
  @apply px-6 py-4 whitespace-nowrap text-sm text-gray-200;
}

/* ───── Селектор роли ───── */
.role-select,
.city-select {
  @apply appearance-none bg-transparent font-semibold pr-8 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50;
}
.role-select option,
.city-select option {
  background-color: #111827;
  color: #e5e7eb;
}
.role-select:focus,
.city-select:focus {
  @apply outline-none;
}
.role-select-icon {
  @apply absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none;
}

/* ───── Кнопки действий ───── */
.action-button-success,
.action-button-danger {
  @apply flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed;
}
.action-button-success {
  @apply bg-green-600/20 text-green-300 hover:bg-green-600/40;
}
.action-button-danger {
  @apply bg-red-600/20 text-red-300 hover:bg-red-600/40;
}
</style>
