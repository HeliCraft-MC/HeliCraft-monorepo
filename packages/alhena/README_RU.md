[English](README.md) | [HeliCraft](../../README_RU.md)

# Alhena

**Дать программам единый официальный способ разговаривать с Antares.**

Generated TypeScript SDK · native Fetch · zero runtime dependencies

Alhena генерируется из OpenAPI Antares через Hey API со встроенным нативным Fetch-клиентом. У пакета **нет runtime-зависимостей**: генератор и TypeScript нужны только для разработки. Сгенерированные транспорт, методы SDK и DTO сохраняются в `src/generated`; вручную их не редактируют.

```sh
bun run generate
bun run dev:alhena
bun run build:alhena
bun run test:alhena
```

`dev:alhena` следит за импортируемыми схемами API, экспортирует OpenAPI, генерирует и собирает SDK. Сервера и Compose нет. Экспортируются `getHello`, `getHealth`, `getReady`, типы и `createClient`. Используйте отдельный клиент вместо изменяемой глобальной конфигурации:

```ts
import { createClient, getHello } from '@helicraft/alhena';
const client = createClient({ baseUrl: 'http://localhost:3000' });
const { data } = await getHello({ client, query: { name: 'Vega' }, throwOnError: true });
console.log(data.message);
```

Транспорт использует Fetch, поддерживает отмену и выбрасывает ошибки при `throwOnError`. Типы не проверяют удалённый ответ в runtime; Vega проверяет приветствие Zod. В будущем внутренний SDK сможет обслуживать публичные интеграции, ботов, аналитику и автоматизацию.

Из корня: `bun run lint` и `bun run format:check`. Правила и исключения: [настройка проверок](../../docs/setup-research_RU.md).

## Название

Альхена — γ Близнецов, звезда в созвездии Близнецов. [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/).

## Web foundation contract

Generated-клиент включает `/api/v1`: identity, account, sessions, skins, public pages/chronicle/site и admin users/content/audit. Вега использует эти методы с относительным same-origin API в браузере; public SSR использует отдельный server client без cookies. При изменении API запускайте корневой `bun run generate`; generated-файлы не редактируются вручную. DTO и permission checks остаются в Антаресе.
