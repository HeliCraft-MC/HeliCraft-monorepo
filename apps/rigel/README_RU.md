[English](README.md) | [HeliCraft](../../README_RU.md)

# Rigel

**Знать, кто входит в мир, и защищать личность игрока.**

Java 25 · Velocity 4.2.0 · Gradle Kotlin DSL

Rigel — основа Velocity-плагина для постоянной идентичности HeliCraft. Он сообщает о запуске и асинхронно проверяет Antares. Независимый от фреймворка record `Identity` отделяет постоянный UUID от способа входа. Он **пока не** авторизует неофициальные клиенты, не связывает аккаунты, не реализует MFA и не проверяет право входа. Сохраняйте `online-mode=true` у Velocity и modern forwarding у Paper.

```sh
bun run build:rigel
bun run test:rigel
bun run dev:rigel
```

Нужен JDK 25. Артефакт: `apps/rigel/build/libs/rigel.jar`. Velocity API подключён compile-only; annotation processor создаёт `velocity-plugin.json`. JUnit 5 проверяет инварианты идентичности. Continuous build пересобирает jar без hot reload прокси. `ANTARES_URL` задаёт адрес health-запроса.

Продакшен из корня: `docker compose --env-file .env -f apps/rigel/compose.yml up -d --build`. Используется пара Deneb/Rigel; Paper требует принятой Minecraft EULA. Только Velocity публикует 25565. Случайный буквенно-цифровой forwarding secret общий с Paper и хранится в приватном томе. Серверный jar, build и checksum Velocity закреплены в `server-lock.json`. После изменения плагина перезапускайте прокси.

Будущие способы входа: официальный Minecraft-аккаунт, дополнительные факторы, подтверждение через Vega и необязательный Altair. Поздняя привязка официального аккаунта не должна менять личность HeliCraft, имущество, гражданство и историю. До отключения стандартной проверки аккаунтов нужен identity API Antares и явный безопасный процесс входа.

Из корня: `bun run lint` и `bun run format:check`. Правила и исключения: [настройка проверок](../../docs/setup-research_RU.md).

## Название

Ригель — β Ориона, звезда в созвездии Ориона. [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/).
