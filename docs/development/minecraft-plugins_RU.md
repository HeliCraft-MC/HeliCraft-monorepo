[English](minecraft-plugins.md) | [Документация](../README_RU.md)

# How to develop Minecraft plugins in HeliCraft

Руководство для изолированного Minecraft Integration V1. Стенд не подключает пользовательскую БД или постоянный мир. См. [архитектуру](../architecture/minecraft-integration_RU.md), [авторизацию](minecraft-authentication_RU.md) и [проверки](../verification/minecraft-integration-2026-10-25_RU.md).

## Требования и версии

Для native-тестов нужны Bun 1.4.2+, Docker/Compose и Java 25. Wrapper скачивает Gradle 9.1.0. Ригель использует Velocity 4.2.0 build 30, Денеб — Paper 26.3 build 223. Server locks содержат URL и SHA-256. LimboAPI `1.1.27-SNAPSHOT` зафиксирован на commit `bfef5799f21d73a80155035c3430f6654aa6b9f8` и checksum в `infra/minecraft/limboapi.properties`; замена upstream-артефакта отклоняется. Для браузера нужен Chromium: `bunx --bun playwright install chromium` (Linux также может требовать системные библиотеки).

Одна установка из корня: `bun install --frozen-lockfile`. JS-команды выполняются Bun; TS7 не понижается. Compose предоставляет Java внутри образов; локальный JDK нужен для явных Gradle/native-тестов. Клиентский мод Minecraft не требуется.

## Полный disposable стенд

```sh
bun run minecraft:prepare
bun run minecraft:config
bun run minecraft:up
bun run minecraft:logs
bun run minecraft:logs rigel
bun run minecraft:logs deneb
bun run minecraft:down
```

Фиксированный Compose-проект `helicraft-minecraft-v1-test` описан в корневом `compose.minecraft.yml`. Подготовка создаёт случайные credentials в игнорируемом `infra/minecraft/run/.env`, права 0600; поля перечислены в соседнем `.env.example`. Production credentials и корневой `.env` не используются. `helicraft_minecraft_test` находится в отдельном PostgreSQL/volume; S3 и Minecraft также используют отдельные volumes. Антарес явно включает тестовую конфигурацию БД. Миграции выполняются до старта API.

Публикуются только `127.0.0.1:8096` (Вега) и `127.0.0.1:25575` (Velocity). У Paper, PostgreSQL и S3 нет host ports. Paper доступен внутри тестового проекта и требует случайный modern-forwarding secret и допуск Денеба. Не подключайте посторонние контейнеры к этим сетям и не публикуйте Paper. Дополнительная игровая сеть internal; API остаётся внутри сети проекта.

Владелец явно разрешил автоматическое принятие Minecraft EULA для локальных/тестовых экземпляров HeliCraft. Стенд пишет `eula=true` при создании и пересоздании без повторных вопросов. Это не разрешение менять production-серверы или пользовательские миры.

`minecraft:up` пересобирает Docker-образы из текущих исходников и перезапускает изменённые службы. Entrypoint перед Java всегда заменяет plugin/config из текущего образа. Старый JAR вручную не копируется. Hot reload авторизации не поддерживается: пересоберите и перезапустите. Первый запуск со скачиваниями и генерацией мира может занимать несколько минут.

Удаление **только данных этого disposable проекта**:

```sh
bun run minecraft:clean
```

`minecraft:down` сохраняет тестовые volumes. Очистка не запускает destructive SQL и не удаляет внешний мир. При удалении/ротации игнорируемого файла credentials очистите/пересоздайте тестовый PostgreSQL volume, иначе пароль БД не совпадёт. Нужные результаты сохраните до очистки.

## Optional local GeoIP

Страница подтверждения показывает IP/порт соединения и версию протокола, переданные Ригелем. Локальные/приватные адреса, включая шлюз Docker, обозначаются отдельно. Без базы у публичных адресов нет геолокации. Эти сведения не удостоверяют владельца аккаунта.

Для страны/города/часового пояса получите совместимую GeoLite2-City или GeoIP2-City MMDB на условиях провайдера и положите её в `infra/geoip/GeoLite2-City.mmdb`. Корневой и Minecraft Compose монтируют каталог только для чтения в `/geoip`; `.mmdb` игнорируются Git. Запуск тестового стенда:

```sh
GEOIP_DATABASE_PATH=/geoip/GeoLite2-City.mmdb bun run minecraft:up
```

Для локального `bun run dev` укажите в `.env` абсолютный путь на хосте. После замены базы перезапустите Антарес. Compose использует путь внутри контейнера. IP игрока не отправляется внешнему API, приложению не нужен ключ провайдера, а при отсутствии результата местоположение не выдумывается. Настройка не скачивает GeoLite и не принимает её условия за оператора. API чтения: [node-maxmind](https://github.com/runk/node-maxmind).

## Сборка и обязательные проверки

```sh
bun run build:rigel
bun run build:deneb
bun run test:java
bun run lint:java
bun run format:check:java
./gradlew :minecraft-client:build
bun run generate
bun run build:ts
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:integration
bun run test:minecraft:contracts
bun run test:minecraft
bun run test:e2e
```

JAR: `apps/rigel/build/libs/rigel.jar`, `apps/deneb/build/libs/deneb.jar`. Общие DTO/HTTP находятся в Gradle library `packages/minecraft-client`. Gson изолирован Shadow отдельно в каждом плагине. LimboAPI устанавливается отдельно и не включается в JAR. Gradle скачивает проверенный compile-only артефакт; Docker использует тот же pin. `dev:rigel`/`dev:deneb` только пересобирают исходники, без обновления живых серверов.

`test:minecraft:contracts` проверяет настоящий HTTP/security Антареса на временном PostgreSQL через Testcontainers. `test:minecraft` собирает текущие Java/TS, запускает свежие PostgreSQL, Velocity/Paper и production Вегу, затем проходит браузерное подтверждение и настоящий Minecraft-протокол. Он также аварийно завершает и перезапускает Java-серверы, ждёт истечения lease, проверяет отказ для неверного forwarding secret, старого сервисного токена, недоступного Paper и другого backend через forced host, затем восстановление с прежним UUID. Native-серверы слушают только loopback. Команда выводит уникальную папку `/tmp/helicraft-minecraft-v1-*` с логами, скриншотами и успешным `result.json`; процессы и контейнер завершаются в `finally`. Пользовательские БД/миры не затрагиваются. Папка может содержать приватную локальную конфигурацию, не публикуйте её целиком.

Harness использует поддерживаемый MCProtocolLib **26.3 / protocol 777** как test-only Java dependency. `:minecraft-client:nativeClientClasspath` готовит classpath; private IPC adapter обрабатывает стандартные teleport acknowledgements и client tick-end. В production-плагинах нет protocol stack и переводящих плагинов. ViaVersion/ViaBackwards не устанавливаются, прежний adapter lock — неиспользуемое историческое доказательство. `test:minecraft:territories` запускает тот же workspace и полную native-приёмку с настоящими squaremap, Вегой и физической юрисдикцией, без второго Compose-стенда. Приёмка человеком в графическом клиенте 26.3 остаётся отдельной проверкой.

Сначала завершайте контейнерные integration suites, затем браузерные. Изменение Docker-интерфейсов на этом хосте может вызвать `ERR_NETWORK_CHANGED` в Chromium; повторяйте браузер после стабилизации инфраструктуры, сохраняя исходную ошибку в отчёте. Отсутствие Docker, доступа к worker-процессам, Chromium/библиотек, Java или сети отличается от регрессии кода. Нельзя скрывать ошибки страницы.

## Приёмка обычным клиентом

1. Запустите `minecraft:up`, откройте [Вегу](http://localhost:8096), создайте тестовый аккаунт и сохраните сессию браузера.
2. В обычном клиенте Minecraft **26.3** задайте имя этого аккаунта и подключитесь к `127.0.0.1:25575`. Имя само по себе не подтверждает владение; не используйте чужой ник.
3. Убедитесь, что отдельное виртуальное ожидание показывает название из настроек, код и `/app/minecraft`. До подтверждения доступа к игровому backend/playerdata быть не должно.
4. В `/app/minecraft` проверьте имя/время, откройте ссылку из игрового чата, проверьте данные подключения и подтвердите кнопкой. Убедитесь, что авторизация на сайте сохраняет ссылку и не подтверждает вход автоматически. Отдельно проверьте ручной ввод кода. Проверьте приветствие Paper, все действительные гражданства или нейтральный ответ, `/heli`, `/heli status`, `/heli profile`, UUID аккаунта и online в Веге.
5. Выйдите: появятся offline и одно событие завершения. Новый вход требует новый код. Отказ, expiry, неверный код и чужая браузерная сессия не должны пропускать игрока.
6. Проверьте неизвестный ник, `/server`/forced-host/transfer до входа, блокировку, отзыв web session, остановку/задержку API, недоступный Paper, неверный forwarding secret, старый service token и перезапуски proxy/Paper. Ожидается отказ или закрытие присутствия по TTL. Не используйте production-миры.

Клиент должен поддерживать выбранный вход через offline proxy с именем аккаунта; имя официального Minecraft-профиля не авторизует Антарес. Microsoft linking, premium bypass и парольная `/login` вне V1.

## Диагностика и восстановление

Ожидаемые строки: точные версии Velocity/Paper/Limbo, `Rigel ready:`, `Deneb ready:`, отсутствие plugin initialization/fatal errors, доступный API. Успешный вход: `Rigel profile assigned account`, `Rigel auth lobby entered account`, `Rigel login admitted account`, `Rigel backend admitted account`, `Deneb joined account` с одним UUID. Кодов, verifier и tokens в этих строках нет.

- Invalid forced hosts: сохраняйте явную пустую таблицу `[forced-hosts]`, без стандартных примерных backend. Проверка допуска действует и для настроенных forced hosts.
- Неверный профиль/порядок: проверьте `rigel` в pre-limbo list и совместимый зафиксированный артефакт. UUID после входа в Paper менять нельзя.
- API/token: проверьте origin/role/backend binding, не печатая credentials. Между хостами нужен HTTPS; ротация через окружение и перезапуск. Anonymous fallback запрещён.
- Forwarding: сверьте приватные secrets и proxy online-mode; Paper работает с `online-mode=false` и включённым Velocity forwarding. Прямой клиент должен отклоняться до join.
- Зависший online: нужны обе leases по 45 секунд; proxy heartbeat не заменяет Paper. Scheduler/чтение кабинета закрывают expiry. Повторяйте вход после очистки; UUID и пользовательские данные не сбрасываются.
- Старый JAR: пересоберите/перезапустите по инструкции и сверьте startup timestamps/version. Continuous Gradle build сам плагин не обновляет.

Для debugging сначала используйте disposable логи, DTO/state-machine tests. Remote Java debugging допускается только явно для локального loopback-процесса; не публикуйте debug ports и HTTP traces с секретами. Парольные команды и полные auth bodies не логируются.

HTTP timeout плагинов задаётся `MINECRAFT_HTTP_TIMEOUT_MS`: по умолчанию 4000, допустимо 1000–10000 мс. Mutation retries намеренно отключены: неоднозначный consumption завершается disconnect/TTL, а не повторным допуском. Native adapter MCProtocolLib использует библиотечный configuration lifecycle и подтверждает телепортации Paper 26.3 точными position/rotation и client tick-end. Переведённый старый клиент не считается native coverage.

## squaremap and world migration

Squaremap Paper 1.4.3 для mc26.3 закреплён URL, SHA-256 и upstream SHA-512 в `infra/minecraft/squaremap-lock.json`. JAR установлен отдельно от Денеба. Внутренний HTTP слушает 8081; Антарес читает только настроенные `SQUAREMAP_TILE_SOURCES` и отдаёт фиксированные PNG-маршруты зарегистрированного мира. Readiness проверяет `/tiles/settings.json` внутри инфраструктуры. Live player tracking выключен. Renderer хранит данные в отдельном тестовом Paper volume.

Денеб автоматически регистрирует основной Overworld в Антаресе при запуске и синхронизации; вводить UUID и измерение не нужно. На административной странице «Территории и миры» видны подключённые миры и ссылки на карту. Обычный перезапуск использует прежнюю запись. Новый Paper UUID создаёт отдельный пустой мир; прежняя привязка основной карты выводится из эксплуатации без переноса границ и истории. Автоматически регистрируется только Overworld. См. [пошаговую инструкцию](../states/territories_RU.md#world-connection). Приватность Paper port и modern forwarding обязательны.

Для ограниченного начального рендера используйте доверенную консоль: `squaremap radiusrender minecraft:overworld 64 0 0`. Она также поддерживает `squaremap fullrender minecraft:overworld`, отмену и статус renderer. Full/radius используют один worker и ограниченные chunk requests/cache; background обрабатывает до 16 чанков каждые десять секунд. Не запускайте бесконечный fullrender при старте и не обещайте фиксированный TPS без измерений. Большой рендер требует выбранной оператором области/времени и мониторинга.

Paper 26.3 может обновить формат мира. Harness этой задачи всегда создаёт новый disposable world, не открывает пользовательский мир и не подключается к БД `helicraft`. Перед переносом постоянного мира оператор останавливает запись, сохраняет полные world/plugin data и БД, проверяет восстановление, тестирует копию на точном locked runtime и сохраняет rollback environment. Одних region files недостаточно.

См. [территориальный workflow](../states/territories_RU.md), [координаты и snapshot/cache contract](../architecture/spatial_RU.md), [актуальные проверки](../verification/territories-2026-10-25_RU.md).
