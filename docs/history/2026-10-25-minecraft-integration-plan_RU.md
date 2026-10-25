[English](2026-10-25-minecraft-integration-plan.md) | [Документация](../README_RU.md)

# Minecraft Integration V1 implementation plan

Исторический план, составленный до реализации 25 октября 2026 года. Последующая реализация и результаты находятся в [проверках](../verification/minecraft-integration-2026-10-25_RU.md). Компиляция не заменяет игровой сценарий.

## Пригодные компоненты

Антарес уже назначает неизменяемый UUID v4, использует уникальный без учёта регистра ASCII username (`[A-Za-z0-9_]{3,16}`), Argon2id, отзываемые браузерные сессии, CSRF с точным Origin, блокировки, приватный аудит и локализованные данные гражданства. В Веге есть защищённые CSR-маршруты, Альхена и Атрия. Java 25-плагины используют Gradle 9.1.0, JUnit 5, Checkstyle и Spotless. Зафиксированы Velocity 4.2.0 build 30 и Paper 26.2 build 129 с SHA-256. Отдельные аккаунты или игровые имена не нужны.

## Порядок реализации

1. Создать домен Minecraft в Антаресе: короткие challenges конкретного соединения, атомарное одноразовое подтверждение и consumption, ограниченные service actors, игровые сессии с TTL и неизменяемые приватные события. Использовать UUID и username аккаунта. Хранить только хеши verifier/code. Подтверждение требует активной сессии владельца и ручного ввода кода из Minecraft. Повторно проверять браузерную сессию при consumption; отзывать допуск при переименовании, смене credentials/status и отзыве сессии.
2. Подключить Ригель к зафиксированному LimboAPI. Разрешать identity в `PreLoginEvent`; назначать профиль в pre-limbo `GameProfileRequestEvent`; регистрировать ожидание в `LoginLimboRegisterEvent`; асинхронно опрашивать API, однократно использовать approval и выходить из limbo. Проверять допуск в `LoginEvent` и каждом `ServerPreConnectEvent`; освобождать ресурсы при disconnect/shutdown. Временный UUID не должен попасть в Paper. Отклонять ошибки и неизвестные backend.
3. Денеб проверяет активный допуск до игры, асинхронно читает профиль и все гражданства, приветствует игрока и обрабатывает `/heli`, `/heli status`, `/heli profile`. Обращения к Paper API возвращаются на игровой поток. Денеб подтверждает реальный вход и heartbeat; proxy disconnect, Paper quit и expiry идемпотентно закрывают присутствие.
4. Защищённый раздел Minecraft в Веге: ожидающие запросы, явный ввод кода, подтверждение/отклонение, identity и недавняя приватная активность. Использовать Альхену, существующие sessions и компоненты Атрии. Исключить данные из публичных loaders и service-worker caches.
5. Создать disposable стенд с отдельным PostgreSQL, runtime-папками и мирами, loopback-прокси и изолированным Paper с modern forwarding. Корневые scripts собирают свежие JAR, устанавливают их, запускают/останавливают стенд, показывают логи и удаляют только тестовые данные. EULA тестового Paper принимается автоматически по явному разрешению владельца.
6. Выполнить PostgreSQL contract/security tests, JUnit unit/HTTP tests, браузерные проверки Веги, строгие TS/Java проверки, Compose и реальный запуск. Исследовать существующий протокольный клиент; честно фиксировать неподдерживаемые версии и сохранять воспроизводимую ручную приёмку.

## Lobby и совместимость

API LimboAPI имеет MIT-лицензию, отдельно устанавливаемый runtime — AGPL-3.0. Не копировать внутренние классы и не включать runtime в JAR Ригеля. Кандидат: `1.1.27-SNAPSHOT`, commit `bfef5799f21d73a80155035c3430f6654aa6b9f8`, SHA-256 `5d541984b90ca7a88eb49ca5f8cc3a803f5ecdfa6d7ed30b605b72ff94156e40`. Upstream собирается с Velocity 4.1.2-SNAPSHOT и Minecraft 26.3; этого недостаточно для вывода о совместимости. Первый настоящий запуск Velocity 4.2.0 успешно загрузил плагин. Проверки клиента, lobby и перехода на Paper ещё обязательны. LimboAuth используется только как пример. `/login <password>` отложен до доказательства изоляции команды и отсутствия секретов в логах.

Если LimboAPI окажется несовместим, использовать разрешённый fallback disconnect/browser/reconnect с одноразовым доказательством владения при переподключении; username или IP недостаточно. Собственный протокольный стек и открытый Paper lobby запрещены.

## Восстановление

Ограничивать HTTP timeout; не запускать параллельные polls одного соединения и не повторять автоматически неоднозначный consumption. При ошибке отключать; переподключение создаёт новый challenge. Disconnect отменяет ожидание. Отказ, expiry, отзыв сессии и изменения аккаунта закрывают допуск. TTL завершает присутствие после аварии. Очистка затрагивает только именованный disposable проект/папки. Ротация credentials — через окружение и перезапуск. Не записывать секретные тела запросов в логи или аудит.

## Источники

- [LimboAPI](https://github.com/Elytrium/LimboAPI), [зафиксированный исходный код](https://github.com/Elytrium/LimboAPI/tree/bfef5799f21d73a80155035c3430f6654aa6b9f8), [лицензия API](https://github.com/Elytrium/LimboAPI/blob/bfef5799f21d73a80155035c3430f6654aa6b9f8/api/LICENSE).
- [LimboAuth](https://github.com/Elytrium/LimboAuth).
- [Velocity events](https://docs.papermc.io/velocity/dev/event-api/), [modern forwarding](https://docs.papermc.io/velocity/player-information-forwarding/), [изоляция backend](https://docs.papermc.io/velocity/security/).
- [Протокольный клиент](https://github.com/PrismarineJS/node-minecraft-protocol), [MockBukkit](https://github.com/MockBukkit/MockBukkit).
