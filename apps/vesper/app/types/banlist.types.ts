/* ────────────────────────────────────────────────────────────── */
/*  Типы для системы банов                                        */
/* ────────────────────────────────────────────────────────────── */

export interface IBan {
    /** Уникальный ID бана в БД */
    id: number;

    /** UUID забанного игрока (без дефисов) */
    uuid: string;

    /** Никнейм забанного игрока (из API) */
    uuid_nickname?: string;

    /** Причина бана */
    reason: string;

    /** Имя администратора, выдавшего бан */
    banned_by_name: string;

    /** Имя того, кто снял бан (null если активен или истёк) */
    removed_by_name: string | null;

    /** UUID того, кто снял бан (null если активен или истёк) */
    removed_by_uuid: string | null;

    /** Причина снятия бана (null если активен) */
    removed_by_reason: string | null;

    /** Дата/время снятия бана (null если активен) */
    removed_by_date: string | null;

    /** Время создания бана (timestamp в ms) */
    time: number;

    /** Время окончания бана (timestamp в ms); -1 или 0 = вечный */
    until: number;

    /** ID шаблона (255 = без шаблона) */
    template: number;

    /** Область применения бана (всегда "*") */
    server_scope: string;

    /** 1 = скрытый бан, 0 = обычный (может быть number или Buffer с data) */
    silent: number | { type: string; data: number[] };

    /** 1 = IP бан, 0 = обычный (может быть number или Buffer с data) */
    ipban: number | { type: string; data: number[] };

    /** 1 = active бан, 0 = снят (может быть number или Buffer с data) */
    active: number | { type: string; data: number[] };
}

export interface IBanListResponse {
    /** Массив банов */
    items: IBan[];

    /** Общее количество записей для пагинации */
    total: number;
}

