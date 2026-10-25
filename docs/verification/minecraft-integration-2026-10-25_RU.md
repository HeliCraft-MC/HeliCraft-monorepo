[English](minecraft-integration-2026-10-25.md) | [Verification](README_RU.md)

# Minecraft Integration V1 verification — 2026-10-25

Объём: локальные изменения поверх `2fcdf31`, не production deployment. Реализовано задание foundation в Антаресе, Веге, Ригеле, Денебе и общей Java REST-библиотеке. [Архитектура/контракты](../architecture/minecraft-integration_RU.md), [разработка и ручная приёмка](../development/minecraft-plugins_RU.md), [вход игрока](../development/minecraft-authentication_RU.md).

## Реализованное поведение

- UUID v4 существующего аккаунта Антареса становится точным UUID Velocity/Paper. Используется прежний ASCII username с уникальностью без регистра; переименование сохраняет UUID и отзывает допуск. Отдельной игровой БД пользователей/паролей и обязательных link/register нет.
- Код в браузере подтверждает одно соединение. Короткий TTL, хеши code/verifier, лимиты, проверки аккаунта/web session, ограниченные служебные credentials, CSRF, ownership, атомарный consumption и отзыв при disconnect/изменениях закрывают доступ при ошибке.
- Ригель назначает identity до limbo, ожидает в зафиксированном LimboAPI, использует подтверждение до backend и проверяет каждый переход. Денеб сверяет forwarded identity до игры, подтверждает настоящий join, показывает локализованный профиль/гражданства через `/heli`, `/heli status`, `/heli profile`. Профильная команда асинхронно читает актуальные данные Антареса.
- Защищённая `/app/minecraft` использует generated Альхену и компоненты Атрии: identity, ожидание, явный ввод/подтверждение/отказ, приватное присутствие с TTL, последний join и активность. Времена запросов/событий включают часы и UTC. Приватные данные не попадают в публичный SSR/кеши.
- Отдельные proxy/Paper leases не оставляют вечный online. События реального входа/выхода неизменяемы, приватны и идемпотентны. Территории, claims, физические учреждения, экономический адаптер и World Engine не добавлены.

## Точные версии

| Компонент               | Версия/pin                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Native JDK              | OpenJDK 25.0.4.1, toolchain 25                                                                                                                   |
| Gradle                  | Wrapper 9.1.0                                                                                                                                    |
| Velocity                | 4.2.0 build 30, SHA-256 `35a5596a5468a035d8a32c8de5ebb0dc6b8d8f0cc3ff5169d514aca762af8aa8`                                                       |
| Paper                   | 26.2 build 129, API `26.2.build.129-stable`, SHA-256 `b1d8f6bfa1b6101fa8e947b53041cb3bdf5540e7b83b6547ca19ba7edefeb083`                          |
| LimboAPI                | `1.1.27-SNAPSHOT`, commit `bfef5799f21d73a80155035c3430f6654aa6b9f8`, SHA-256 `5d541984b90ca7a88eb49ca5f8cc3a803f5ecdfa6d7ed30b605b72ff94156e40` |
| Java HTTP/DTO           | Gson 2.13.2, изолирован в каждом плагине                                                                                                         |
| Java tests              | JUnit Jupiter 5.13.4 / Platform 1.13.4                                                                                                           |
| Протокольный harness    | `minecraft-protocol` 1.68.0, Minecraft 26.1                                                                                                      |
| Только тестовый перевод | ViaVersion/ViaBackwards 5.12.1, SHA-256 в `infra/minecraft/test-adapters.json`                                                                   |
| Web/test                | Bun 1.4.2, TypeScript 7.0.2, Playwright 1.63.0, Vitest 5.0.3                                                                                     |
| Инфраструктура          | Docker 29.9.1 / Compose 5.6.0, PostgreSQL/PostGIS `18-3.6`, SeaweedFS 4.48                                                                       |

LimboAPI выбран после изучения исходников/релизов/лицензий и настоящих запусков. API имеет MIT, отдельный runtime — AGPL-3.0 и не включён в JAR Ригеля. LimboAuth — только reference. Собственный протокольный стек не создавался. Исследована ветка MockBukkit 26.2; выбраны чистая логика и настоящий Paper без ещё одной изменяемой snapshot-зависимости. Парольная `/login` недоступна: история команд/перехват не дают браузерной границы защиты пароля аккаунта.

## Выполненные команды

| Команда/проверка                                                                        | Фактический результат                                                                                                                           |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run db:generate`, review SQL                                                       | Аддитивная `0044_uneven_annihilus.sql`: три таблицы Minecraft, FK/check/index и append-only trigger; применена на временном PostgreSQL          |
| `bun run generate`, `bun run build:ts`                                                  | Успешно: свежая Альхена, Антарес, production Вега; также выполнялись внутри `test:minecraft`/`test:e2e`                                         |
| `bun run typecheck`                                                                     | Успешно: корень и все четыре Bun workspace, TS7                                                                                                 |
| `bun run lint`                                                                          | Успешно: строгий type-aware oxlint, адресные исключения описаны в quality                                                                       |
| `bun run test:unit`                                                                     | 219 тестов: Антарес 133, Вега 61, Атрия 24, Альхена 1 (финальная root-команда вместе с генерацией)                                              |
| `bun run test:integration`                                                              | 34 файла / 90 тестов: States, Governance, Voting, Monetary, Taxation, Companies, FX, Diplomacy и первоначальные Minecraft-сценарии              |
| `bun run test:minecraft:contracts`                                                      | Расширенный финальный Minecraft suite: 13 тестов на свежем PostgreSQL, включая действующее многоязычное гражданство и scope сервисов одной роли |
| `./gradlew spotlessApply :minecraft-client:build :rigel:build :deneb:build --no-daemon` | Успешно: 10 JUnit, Checkstyle, Spotless, компилятор с warnings-as-errors                                                                        |
| `minecraft:config`, `minecraft:up`                                                      | Полный Compose собран/мигрирован/запущен; PostgreSQL, S3, Антарес, Вега, Денеб, Ригель healthy; миграции завершились успешно                    |
| `minecraft:logs`, `minecraft:down`, `minecraft:clean`                                   | Выполнены; удалены только disposable containers/networks/volumes этого проекта                                                                  |
| `bun run test:minecraft`                                                                | Финальная свежая сборка и настоящий browser/protocol сценарий прошли; расширенные отрицательные проверки прошли                                 |
| `bun run test:e2e`                                                                      | Финальный повтор Playwright: 37 passed, один предусмотренный dev-only skip проверки production cache                                            |
| Изолированная проверка неверного pin `downloadLimbo`                                    | Ожидаемый отказ `LimboAPI checksum mismatch`; несовместимый JAR не установлен                                                                   |
| Форматирование, Markdown links, Compose matrix                                          | Итоговые результаты ниже                                                                                                                        |

Проверка неверного pin копирует настоящую root Gradle task в `/tmp/helicraft-limbo-pin-negative`, указывает локальный runtime JAR с намеренно неверной SHA-256 и запускает `./gradlew -p /tmp/helicraft-limbo-pin-negative downloadLimbo --offline --no-daemon`. Она завершилась отказом проверки суммы до записи runtime. Это проверка запрета непроверенной/несовместимой подмены артефакта, а не совместимости произвольных старых версий Limbo. Лог: `/tmp/helicraft-limbo-pin-negative.log`.

Первый unit-запуск в ограниченном окружении не смог запустить Vitest workers и завершился timeout. При обычном доступе к процессам тесты прошли. Это ограничение среды, не успешная проверка и не регрессия кода. Существующие PostgreSQL-тесты выводят предупреждения `pg@9` о параллельных queries; suite прошёл, новые Minecraft-транзакции выполняют операции последовательно.

## Настоящий runtime

Финальная native-папка: `/tmp/helicraft-minecraft-v1-ruEawO`, локальная и не tracked. Содержит `paper.log`, `velocity.log`, `vega.log`, `minecraft-online.png`, `minecraft-last.png`, успешный `result.json`. Скриншоты просмотрены; online/offline и активность проверялись также в самом браузере. Пути относятся к этому хосту и не гарантированы в свежем checkout. В папках есть приватная тестовая конфигурация; не публикуйте их целиком.

Проверено:

1. Неизвестный ник отклоняется с адресом регистрации. Прямой вход в Paper получает “This server requires you to connect with Velocity.” Неавторизованные playerdata не создаются.
2. Настоящий протокольный клиент получает UUID аккаунта в login success, входит в виртуальное limbo, видит код; `/server deneb` до подтверждения не даёт доступа.
3. Настоящая авторизованная Chromium-страница получает локализованный отказ для неверного кода, затем вводит правильный и явно подтверждает. Ригель использует его один раз; Paper получает тот же UUID, Денеб показывает проверенный профиль/гражданства.
4. `/heli profile` возвращает UUID через настоящий игровой chat. В Веге виден online и реальное событие входа.
5. Disconnect показывает offline и одно событие выхода. Paper сохраняет `disposable-world/players/data/<UUID Антареса>.dat`, актуальный layout 26.2.
6. Переподключение сохраняет UUID, выдаёт новый challenge. Отклонение без кода отключает до Paper и не создаёт новый start event.
7. Остановка HTTP API запрещает новый вход известного аккаунта до login success; anonymous/offline fallback и нового start event нет.
8. `SIGKILL` обоих работающих Java-серверов закрывает присутствие через 45-секундный lease с одним end event. Настоящий перезапуск повторно использует мир и UUID, но требует нового challenge; переподключение без подтверждения не допускается.
9. Неверный forwarding secret, остановленный Paper, устаревший токен Ригеля и настроенный forced host `escape.test` к неразрешённому backend завершаются отказом без нового start event. После восстановления конфигурации подтверждённый вход/выход снова проходит. Единственный сохранённый playerdata UUID принадлежит аккаунту.

В здоровых начальных native/Compose startup logs нет `ERROR`/exception traces; native harness проверяет это автоматически. Отдельные логи намеренно неверного forwarding/остановленного Paper содержат ожидаемые ошибки/отказы Velocity. Остаются ожидаемые предупреждения об offline proxy, Java `Unsafe` и более новом Paper. Offline proxy защищён Antares/Limbo/Deneb, private Paper и modern forwarding; анонимного допуска нет.

Отдельно запускался весь Compose из текущих исходников со случайными private credentials. Реально опубликованы только loopback web 8096 и proxy 25575; Paper/PostgreSQL/S3 host ports отсутствуют. Native-проверка привязывала Paper к loopback и проверяла прямой протокольный отказ.

## Безопасность и миграции

Настоящий PostgreSQL suite проверяет отсутствующие/неверные credentials, неверную роль, запрет cookies в служебных запросах, browser CSRF, неизвестные/Unicode имена, запрет client-selected account UUID, каноническое имя/UUID, хеши секретов, чужие challenges, неправильный код/connection ID, параллельный consumption/replay, параллельные challenges, лимит ошибок кода, rejection/cancel, expiry, revoked/expired web approval, ban, переименование, потерю proxy polling, online только после Paper join, неправильный UUID, идемпотентные joins/closes/events, SQL append-only, expiry Paper lease и отзыв после смены пароля. Дополнительно проверены изоляция proxy/backend одной роли, неверный verifier, одновременные approvals и все действующие многоязычные гражданства без исторических основателей после выхода. Java покрывает поздний approval после close, UUID mismatch/expiry, нормализацию, настоящий malformed/error/slow HTTP, отсутствие retry при timeout, локализованные несколько гражданств и нейтральный ответ.

Destructive schema push/reset, пользовательская БД `helicraft`, пользовательские остатки/государства/аккаунты и постоянный мир не использовались. Миграция добавляет только домен Minecraft. Только Антарес обращается к БД/S3, Java использует scoped REST. Тестовая EULA принята автоматически по явному разрешению владельца.

Добавлены 13 операций из [таблицы REST](../architecture/minecraft-integration_RU.md#rest-и-сохранение), schemas challenge/issued proof/admission/session/profile/owner view. Созданы `apps/{rigel,deneb,antares,vega}/AGENTS.md`; обновлены root AGENTS, README-пары, product map, identity и явное уточнение GDD. Парные EN/RU architecture/development/authentication/plan/report связаны через индексы.

## Исправления и ручная область

Первый запуск обнаружил стандартные example forced hosts — исправлено явной пустой таблицей. `_version` Paper исправлен с 32 на поддерживаемую 31. Протокольная библиотека сохраняла неиспользованные known-packs listeners после limbo и отвечала дважды; тестовый адаптер очищает их при штатном окончании configuration. Проверка сначала искала старый `playerdata`, теперь сверяет реальный `players/data` 26.2. Эти ранние ошибки не засчитаны как успешные прогоны.

Первый общий Vega E2E обнаружил устаревшую навигацию и селекторы свёрнутых действий в `institution-setup`, `state-workspace`, `taxation`. Тесты теперь используют существующий раздел «Институты» и раскрывают существующие панели действий; проверки полномочий сохранены. Продуктовое поведение государственных/денежных/налоговых модулей ради селекторов не менялось. Полный повтор: 37 passed, один предусмотренный dev-only skip.

Обычный графический клиент Minecraft **26.2** человеком не проверялся. Автоматизация проходит реальное соединение 26.1 с переводом до настоящего зафиксированного Paper 26.2, без заявления о native 26.2 packet/UI coverage. В [ручном checklist](../development/minecraft-plugins_RU.md#приёмка-обычным-клиентом) остаются native titles/chat и дополнительные варианты transfer/rotation. Автоматический реальный runtime покрывает совместную аварию, lease expiry, restart, неверный forwarding secret, остановленный Paper, старый токен и forced host к другому backend. Произвольные несовместимые сторонние runtime-версии не поддерживаются и не объявлены проверенными: установка допускает только совместимый LimboAPI с зафиксированной контрольной суммой. Медленный HTTP проверен настоящим задержанным loopback-сервером в Java-тестах. Пользовательские скины сайта эта foundation не передаёт в Minecraft.

Точки расширения: типизированные физические факты/события, проверенные territorial snapshots и локальные spatial/claim caches. Антарес/PostGIS остаётся authoritative; физические события не дают плагинам финансовых/государственных полномочий. Дополнительные игровые системы не реализованы.

## Итог прогона

Полный повтор Playwright Веги: 37 passed, один предусмотренный dev-only skip. Root/per-app Compose matrix и disposable Minecraft config прошли. `bun run format:check` прошёл на 1479 файлах; локальные Markdown-файлы и anchors — на 105 активных документах. `git diff --check` прошёл. Финальный root unit-повтор: все 219 тестов; финальные Minecraft contracts: все 13 сценариев. Полный реальный runtime, включая описанные отказы, завершился успешно и остановил свои процессы/контейнер.
