[English](territories-2026-10-25.md) | [Verification](README_RU.md)

# Territories & Political Map V1 verification — 2026-10-25

Статус: реализовано в репозитории; обязательная автоматизированная приёмка завершена 26 октября 2026 года. Production deployment не выполнялся. Ниже сохранены датированные начальные ошибки и последующие проверки; итоговая матрица и доказательства находятся в конце. Приёмка человеком в графическом клиенте 26.3 остаётся отдельной непроведённой проверкой.

## Официальные артефакты

Официальный [Paper Downloads Service](https://fill.papermc.io/v3/projects/paper/versions/26.3/builds) вернул stable build **223**, опубликованный 25 октября 2026 года в 12:46:54 UTC, новее указанного в задании 222. Точный [Paper API POM](https://artifactory.papermc.io/artifactory/universe/io/papermc/paper/paper-api/26.3.build.223-stable/paper-api-26.3.build.223-stable.pom) и запущенный сервер подтверждают `26.3.build.223-stable`; Java runtime — 25. Точные URL сохранены в locks сервера и плагинов.

| Артефакт        | Версия                                                                                    | SHA-256                                                            |
| --------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Paper           | 26.3 build 223 stable                                                                     | `f8e684a4fef2a8b46d03aac049b49d59275e9ce5367dba7c6075cb5780f38470` |
| Velocity        | 4.2.0 build 30 stable                                                                     | `35a5596a5468a035d8a32c8de5ebb0dc6b8d8f0cc3ff5169d514aca762af8aa8` |
| LimboAPI        | 1.1.27-SNAPSHOT, commit `bfef5799f21d73a80155035c3430f6654aa6b9f8`                        | `5d541984b90ca7a88eb49ca5f8cc3a803f5ecdfa6d7ed30b605b72ff94156e40` |
| squaremap Paper | 1.4.3 / mc26.3, [Modrinth release 6wmZVQBO](https://api.modrinth.com/v2/version/6wmZVQBO) | `d13331799cd5ace6c02b7e625eda40f0fb69c4f89c3778324758bf6f25f49f08` |

Скачанный squaremap также совпал с SHA-512 Modrinth `8e3fde14937a8ff7776a37f43385942ff76bab4d2a5f9e9d5290a22c5dc26b21fbde666439e48b0f128e09083ac06b96e56263e2ee740e8550bc5c61e408a4c1`. Встроенная source map и официальные Java-исходники v1.4.3 подтверждают путь `tiles/{world-key}/{zoom}/{tile-x}_{tile-z}.png`, тайлы 512px, `minecraft_overworld`, максимальный native zoom 3, extra zoom 2 и Leaflet `CRS.Simple`: `[lat,lng]=[-Z/2^maxZoom,X/2^maxZoom]`.

Прямые закреплённые источники: [Paper JAR](https://fill-data.papermc.io/v1/objects/f8e684a4fef2a8b46d03aac049b49d59275e9ce5367dba7c6075cb5780f38470/paper-26.3-223.jar), [Velocity JAR](https://fill-data.papermc.io/v1/objects/35a5596a5468a035d8a32c8de5ebb0dc6b8d8f0cc3ff5169d514aca762af8aa8/velocity-4.2.0-30.jar), [артефакт LimboAPI](https://github.com/Elytrium/LimboAPI/releases/download/dev-build/limboapi-1.1.27-SNAPSHOT.jar), [squaremap JAR](https://cdn.modrinth.com/data/PFb7ZqK6/versions/6wmZVQBO/squaremap-paper-mc26.3-1.4.3.jar). URL LimboAPI dev-build изменяемый; закреплённая checksum намеренно отклоняет замену. Native test codec: [OpenCollab MCProtocolLib 26.3](https://repo.opencollab.dev/maven-releases/org/geysermc/mcprotocollib/protocol/26.3/).

## Первоначальные проверки

- `./gradlew :minecraft-client:build :rigel:build :deneb:build --no-daemon`: успешно после перехода Денеба на точный Paper API 26.3. Последующие компиляция native test client, JUnit и Checkstyle/Spotless общего клиента также прошли.
- `bun run build:ts`: успешно до добавления пространственных API; это не итоговая проверка spatial UI/build.
- `bun run test:minecraft:contracts`: **13 passed**, disposable PostGIS и актуальные на момент прогона миграции.
- `bun run --cwd apps/antares test:integration tests/spatial.integration.test.ts`: первые **4 passed**. Проверены настоящая реформа Governance, версии draft, неизменяемая отправка, single-office directive, отдельные административные полномочия/ратификация, immutable revision/event, строгая граничная политика, Polygon/MultiPolygon/holes, ошибочная/вырожденная геометрия, лимит площади, соседний край, наложение и разные миры. Матрица расширяется; полная проверка конкурентности/Voting ещё не подтверждена.
- `bun --no-env-file scripts/minecraft.ts config`: успешно. Сборка контейнеров, readiness, карта через Вегу и внешние порты ещё требуют приёмки.
- Генерация Alhena и корневая компиляция TS после первоначальных пространственных API: успешно. Полные проверки каждого workspace ещё предстоят.

## Native Minecraft и настоящий squaremap

На новом disposable мире в `/tmp/helicraft-native-26.3-K7eLGI` запущены Paper 26.3-223, Денеб и squaremap 1.4.3 на Java 25. Оба плагина загрузились, игровой порт слушал loopback, HTTP renderer — `127.0.0.1:8081`. Рендер Nether/End и live player tracking выключены. После проверки сервер остановлен.

Radius render 48 блоков около X/Z 0/0 обработал 49 чанков. Замена поверхности 32×32 на Y=300 с красного на синий бетон, сохранение и повторный ограниченный render изменили настоящий HTTP PNG `tiles/minecraft_overworld/3/0_0.png`:

- До: `b05c7d7d9f45e1339e33fc07e989eacabefcd4ac2db54dcaffeb633a60f89f8f`.
- После: `b67e4cffaf6ae34e02c4129a406367a5949dce831f66ca0451af55b9de629408`.

PNG просмотрен: содержит настоящую поверхность и изменённую площадку. Подтверждены старт renderer, генерация и явный ограниченный re-render после изменения блоков; автоматическое фоновое обновление, browser transform и карта/редактор Веги пока не проверены.

Готовый **MCProtocolLib 26.3** использует native protocol **777**. Это test-only dependency; собственный protocol stack и переводящие плагины не входят в production. Существующий Minecraft harness теперь получает private IPC events вместо `minecraft-protocol` 26.1. Первый полный прогон дошёл до подтверждения в браузере, но Paper отклонил вход: новые properties по умолчанию включили пустой whitelist. Явная конфигурация теперь использует admission Антареса и закрытый modern forwarding с `white-list=false`.

Второй прогон `/tmp/helicraft-minecraft-v1-J1H55f/result.json` **прошёл** native lobby → явное подтверждение кода → постоянный UUID → приветствие/profile/presence Paper → disconnect. Также прошли неизвестный ник, прямой Paper, pre-auth `/server`, reconnect, отказ в браузере, потеря API, crash lease expiry, настоящие рестарты proxy/Paper, неправильный forwarding secret, недоступный Paper, устаревший service token, отказ forced-host/другому backend и восстановление. ViaVersion/ViaBackwards не устанавливались. Browser page errors отсутствуют.

| Приёмка                                               | Текущие доказательства                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Native Paper 26.3 runtime                             | Passed                                                                                           |
| Native Minecraft 26.3 protocol client, identity flow  | Passed с MCProtocolLib 26.3 / 777                                                                |
| Совместимость Velocity 4.2.0 + закреплённого LimboAPI | Passed в этом native identity flow                                                               |
| Ручная приёмка графическим Minecraft 26.3             | Pending                                                                                          |
| Территориальные переходы и `/heli whereami`           | Passed в native spatial-прогоне ниже                                                             |
| R1→R2 без рестарта; spatial outage/reconciliation     | Passed в native spatial-прогоне ниже                                                             |
| Скриншоты настоящей карты/редактора Веги и Playwright | Passed в live renderer/browser-прогоне ниже; расширенные keyboard/error/history-проверки впереди |

Пользовательская БД `helicraft`, постоянные миры и старые чанки не использовались. Тестовая EULA принята по явному разрешению. Временные каталоги содержат приватную локальную конфигурацию; не публикуйте их целиком.

## Native territorial acceptance и браузерный сценарий настоящей карты

Завершённый native-прогон `/tmp/helicraft-minecraft-v1-asRVeW/result.json` прошёл существующие identity/security/fault-сценарии и настоящую пространственную механику. В `spatial-result.json` записаны protocol 777, Paper 26.3-223, два государства, ревизии мира 2→3→4 и отсутствие рестарта Paper между территориальными изменениями. Обычным движением игрок вошёл в Лорию на X=17/Z=0.5; отдельное private evidence содержит ответ сервера `/heli whereami`. Телепортации проверили Wilderness, Аврору и внутреннее отверстие. Колебания на общей границе короче 500мс не повторяли уведомления, а остановка ровно на X=16 дала Wilderness. Обычный игрок не получал snapshot debug identifiers.

Сокращение территории через настоящий workflow Антареса draft→Governance→администрация изменило юрисдикцию неподвижного игрока на Wilderness. Test-only сбой только spatial namespace сохранил последний проверенный snapshot и независимо действующий игровой admission. Во время сбоя опубликована ещё одна ревизия; reconciliation получил её после восстановления и изменил юрисдикцию неподвижного игрока без reload. Ошибки авторизации по-прежнему закрывают доступ.

ViaVersion/ViaBackwards не устанавливались. Native test client отправляет стандартный для 26.3 client tick-end после движения: ранняя попытка выявила это требование и завершилась disconnect до исправления. Следующая попытка использовала короткие физические шаги вместо одного большого перемещения. Эти ошибки не засчитываются как успешная проверка движения.

Последующий прогон `/tmp/helicraft-minecraft-v1-sOvNda` прошёл настоящий браузерный сценарий Веги при работающих Paper/squaremap и disposable PostGIS: уполномоченное создание draft, рисование полигона указателем, перенос вершины, отверстие, локализованное обоснование, save/PostGIS preview, восстановление геометрии после reload, отправка существующей Governance-процедуры, отдельная ратификация администратором и публичная SSR-карта. HTML содержал опубликованное государство и не содержал приватное обоснование. Desktop и mobile 390px прошли без page errors и горизонтального переполнения документа. Пространственная игровая часть с горячим обновлением и outage также прошла; итоговый `result.json` также подтверждает полную identity/security/fault-suite и остановку всех disposable процессов. Ревизии мира — 3→4→5, с учётом третьего государства из браузера. SHA-256 настоящего тайла изменился с `78376a94b5e4276fa9a476273d69dea0ab894579473ef5a0cc48528ff4b18484` на `39ba81f06ff8c821c8c106f575eb0e9d75c1293c0d0336832f630fb2464293cb`.

- [Настоящая публичная карта, desktop](assets/territories-2026-10-25/political-map-desktop.png).
- [Настоящая публичная карта, mobile](assets/territories-2026-10-25/political-map-mobile.png).
- [Настоящий редактор после правок указателем и восстановления сохранения](assets/territories-2026-10-25/territory-editor-desktop.png).

Renderer намеренно отрисовывает небольшую область; окружающая неотрисованная поверхность явно отмечена как недоступная. Это настоящие тайлы, а не нейтральный fixture Storybook. Leaflet 1.9.4 и Geoman Free 2.20.4 закреплены точно. Отдельная browser-проверка общего компонента прошла перенос вершины, ещё одно отверстие, MultiPolygon и desktop/mobile-просмотр. Прошли пять transform unit cases: отрицательные и предельные координаты Minecraft, нестандартный native zoom. На этом этапе прошли сборки Storybook и production Веги, типы Атрии/Веги и строгий lint новых файлов карты/редактора.

На этом этапе оставались расширенные проверки полномочий/конкурентности, браузерная приёмка истории ревизий, интеграция языковой настройки, полные regression/quality checks, итоговая Compose image/readiness/port-приёмка, каноническая документация и проверка фонового обновления renderer. На том этапе задача целиком ещё не была завершена.

## Последующие quality и persistence checks

После добавления публичной immutable-истории и защищённых статусов ратификации spatial-suite прошла **15 тестов в четырёх файлах**. Прямой SQL-сценарий использует независимые соединения без глобального сервисного authorization lock: ровно одна перекрывающаяся публикация фиксируется, вторая откатывается без осиротевших review/revision/event. Deferred constraint отклоняет одобрение без публикации; прямой INSERT события и подмена state/world активного указателя запрещены. Опубликованная история доступна после вывода мира из эксплуатации. Первая попытка нового PL/pgSQL не прошла разбор миграции из-за CASE без скобок; исправленная миграция применена с нуля в прошедших suites.

Полная интеграционная регрессия Антареса затем прошла **109 тестов в 38 файлах** на disposable PostgreSQL/PostGIS (477.89s). На этом этапе прошли `build:ts`, корневые `typecheck`, строгий `lint` и все unit suites: Антарес 133, Вега 61, Атриа 29, Альхена 1. Gradle build общего клиента/Ригеля/Денеба, JUnit, Checkstyle и Spotless также прошли. После этого добавлены autosave, reset и копирование координат; их итоговая браузерная приёмка и повторные release gates ещё впереди.

Существующий Minecraft Compose-проект собран и запущен при отсутствии прежних контейнеров и томов этого проекта. Все сервисы стали healthy, включая squaremap HTTP readiness по `/tiles/settings.json`; первоначальный неверный `/settings.json` исправлен после настоящего 404. Миграции Антареса выполнены в `helicraft_minecraft_test`. Docker port bindings публикуют только loopback Веги 8096 и Velocity 25575; у Paper 25566, squaremap 8081, PostgreSQL 5432 и storage нет host publications. Настоящий HTML `/map` вернул HTTP 200, SSR-заголовок и сообщение о регистрации мира. Эта Compose-сборка предшествует последним изменениям autosave.

## Расширенная native-приёмка и сохранность

Последующий полный прогон `/tmp/helicraft-minecraft-v1-Xx1Egk/result.json` подтвердил native protocol 777 и весь identity/fault suite. `spatial-result.json` фиксирует версии мира 3→4→5 без рестарта Paper, настоящее обычное движение, teleport, ожидание/jitter на общей границе, обычную вагонетку на powered rails через границы, Nether/End commons и возвращение, а также распознавание третьего государства, нарисованного в браузере. R2 и R3 отправлены, проверены и отдельно ратифицированы через Вегу. Сбой только spatial API длился больше 30 секунд: прежняя проверенная юрисдикция явно помечалась устаревшей, после восстановления установлена пропущенная ревизия. Официальные локализованные названия обновились через integrity без изменения геометрии/версии. Повторный вход, подтверждённый по-русски на настоящей странице Веги, дал русские welcome, title и `/heli whereami` на сохранённой позиции игрока. ViaVersion/ViaBackwards не устанавливались, ошибок страницы не было.

Hash настоящего тайла: `ff46b0e8f34cfd10866fe4f44b90840f2ad41ba4703a4152fd08021a8afa0e16` до, `1d499769524845cb4a235d40c33e0b39add72fa932c9f97b83ce0df44b1d613d` после явного рендера и `cce4d3498d5dc0bf32352734612b4529ada1b8ced94df8fa21a42b7227de27b0` после следующего изменения блоков с автоматическим background update без новой команды render. Ограниченная платформа занимала 24 чанка, постоянный пользовательский мир не открывался.

Браузер также подтвердил undo/redo геометрии, autosave, клавиатурный сброс, reload сохранения, историю ревизий, переключатели названий/поверхности и копирование с точным отрицательным X/Z. Первая расширенная попытка выявила clipboard fallback в headless; явные permissions контекста и focus страницы решили проблему. Следующая попытка прошла browser/vehicle/dimension, но ожидала повторный title при teleport внутри той же юрисдикции; исправленная проверка требует отсутствия спама. Эти попытки сохранены как неуспешные полные прогоны.

Затем полная регрессия Антареса прошла **112 тестов в 38 файлах** (514,58 с). Отдельный актуальный PostGIS/API прогон прошёл **10 тестов**, включая каталог без геометрии, включение/исключение по bounding box и отзыв с повторным назначением того же должностного лица. Для sealed reason запрещено добавлять прежде отсутствующий перевод. Все текущие unit suites успешны: Антарес 133, Вега 63, Атриа 29, Альхена 1. Java build/JUnit/Checkstyle/Spotless, TS build/typecheck и строгий lint прошли. Девять корневых/затронутых Compose-описаний и 833 локальные Markdown-ссылки/изображения проверены на этом этапе. Приёмка viewport в браузере, итоговый Compose startup и общая браузерная регрессия будут зафиксированы ниже после выполнения.

## Итоговые Compose и component checks

Новый чистый запуск Compose сначала завершился ошибкой до любого SQL миграции: socket-based `pg_isready` объявил PostgreSQL готовым, пока временный init-server ещё не слушал TCP. Healthcheck тестового проекта теперь использует `-h 127.0.0.1`. После удаления только disposable volumes этого прогона чистый запуск прошёл: 48 миграций применились к `helicraft_minecraft_test`, все шесть постоянных служб healthy, squaremap `/tiles/settings.json` вернул HTTP 200, `/map?lang=en` — HTTP 200 с SSR title и инструкцией регистрации мира. Проверка подтвердила только публикации `127.0.0.1:8096` и `127.0.0.1:25575`. Основной Compose теперь передаёт API необязательную server-only переменную `SQUAREMAP_TILE_SOURCES`; все девять Compose-описаний валидны.

Итоговая сборка Storybook Атриа и реальная браузерная проверка вершин/holes/MultiPolygon на desktop/mobile прошли. Отдельная браузерная регрессия прошла **22 теста компаний/workspace** и **14 тестов публичной галереи** в development и production. Эти независимые типизированные fixtures дополняют полные suites с настоящим PostGIS.

## Продолжение — 26 октября 2026 года

Перезапуск хоста/сессии удалил прежние runtime-каталоги `/tmp` и прервал ожидавшуюся дополнительную проверку. Результаты выше остаются датированными историческими доказательствами, а не файлами, заново просмотренными сегодня. Пользователь запустил остановленный Docker daemon. Новые журналы сохраняются в игнорируемом `build/territories-verification/`.

Свежие проверки прошли: `build:ts`, `typecheck`, строгий `lint`, `format:check`, все **226 unit-тестов** и `./gradlew build spotlessCheck --rerun-tasks` (выполнены 28 задач, включая JUnit). Полный актуальный spatial PostGIS/API/SQL/shared-fixture suite прошёл **17 тестов в четырёх файлах** (27,28 с).

Прежний основной Playwright-прогон завершился с 36 успешными тестами, одним предусмотренным пропуском в development и одной ошибкой production taxation. Причина отдельно воспроизведена в пустом поле Chromium: `datetime-local` нормализует `.060` в `.06`, а Playwright fill сравнивает точную переданную строку. Существующий тестовый помощник теперь получает каноническое значение браузера перед вводом, сохраняя миллисекунды и не меняя продуктовую налоговую логику. После этого оба полных налоговых пути development/production прошли (**2 теста**, 1,2 мин). Отдельный Companies/FX-прогон намеренно прерван, чтобы завершить изменения Docker-сетей до браузера; успешным он не считается. Полный повтор и итоговая native-приёмка viewport будут зафиксированы ниже после завершения.

## Итоговая native-приёмка и матрица завершения — 26 октября 2026 года

`bun run test:minecraft:territories` успешно завершился на итоговом продуктовом коде в `/tmp/helicraft-minecraft-v1-cBlSjb`. [Обезличенный результат](assets/territories-2026-10-26/acceptance.json) и [spatial result](assets/territories-2026-10-26/spatial-result.json) сохранены в репозитории. Tokens, verifiers, коды подтверждения и приватная runtime-конфигурация не копировались. Полный native/browser/identity/fault suite прошёл без page errors, с native protocol 777 и без переводящих плагинов. Дочерние процессы и одноразовые контейнеры завершились при очистке.

Новый viewport-тест проверяет четыре ограниченных X/Z-параметра запроса, изменение запроса после клавиатурного pan, копирование отрицательных координат, mobile и SPA-unmount сразу после resize. Первая попытка выявила отложенный Leaflet moveend listener, обращавшийся к удалённой карте (`_leaflet_pos`). Runtime теперь снимает bounds-listener, отмечает disposal и игнорирует ожидающую работу ResizeObserver до удаления; полный повтор прошёл без подавления ошибок. Актуальные Storybook build и реальная браузерная проверка вершин/holes/MultiPolygon на desktop/mobile тоже прошли.

Companies/FX завершил **4 браузерных теста** development/production (2,5 мин). Журналы сохраняют нефатальные SSR AbortError при закрытии соединений клиентом и существующие предупреждения PostgreSQL о concurrent queries; они не объявляются browser page errors и не подавляются. Исправленный налоговый повтор, остальные 36 успешных основных сценариев, 22 companies/workspace и 14 public-gallery подтверждают соответствующую регрессию. Development-копия production-assets-only теста основного набора намеренно пропущена; production-копия прошла.

Итоговая сверка добавила настоящий государственный анклав: два независимых государства проходят собственный Governance и административную ратификацию, внутреннее точно занимает hole внешнего. PostGIS и JTS одинаково относят `(8,24)` к внешнему государству, `(24,24)` к анклаву, общие края `(16,24)`/`(32,24)` — к Wilderness. Первая fixture повторно использовала активную привязку тайлов и была правильно отклонена; с отдельным world tile key полный **spatial lifecycle-файл из 10 тестов** прошёл. Теперь JUnit Денеба содержит **14 тестов** (общий клиент 5, Ригель 3; **всего 22 Java-теста**), все успешны вместе с Checkstyle/Spotless. Отдельный четырёхфайловый spatial-прогон прошёл 17 случаев до добавления анклава. Прежняя полная регрессия Антареса остаётся датированным прогоном 112 тестов и не выдаётся за новый полный запуск.

| Критерии задания §18                                                       | Доказательства                                                                                                                                      |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–4: native Paper/Денеб/Ригель/Limbo/squaremap                             | Точные locks и SHA-256 выше; native startup и protocol-777 result                                                                                   |
| 5–8: настоящая публичная карта, draft, polygon/holes editor                | Renderer PNG, pointer/keyboard/autosave/reload Playwright flow и сохранённые скриншоты                                                              |
| 9, 14–15: PostGIS validity, конкурентная защита, общий край                | Geometry/API/lifecycle и независимые SQL-writer suites; общие JTS fixtures                                                                          |
| 10: первая территория действующего государства                             | Обычная реформа Governance и INITIAL draft существующего ACTIVE-государства без повторного учреждения и выдуманного полигона                        |
| 11–13: Governance, отдельные approve/reject, immutable publication/history | Single-office, combined Voting, stale revision/отозванный мандат/replay; ratification, SQL completeness/immutability и публичная история            |
| 16–19: проверенный snapshot, физический вход/выход, whereami               | Настоящее движение, teleport, hole/shared-edge dwell, вагонетка, dimensions и reconnect на сохранённой позиции                                      |
| 20: геометрия меняется без рестарта Paper                                  | R1=3 → R2=4 через Вегу и отдельного администратора; stationary reclassification и whereami                                                          |
| 21–22: доступность и восстановление пропущенной ревизии                    | Spatial outage сохраняет явно устаревший R2; восстановление устанавливает версию 5; независимая авторизация остаётся fail-closed                    |
| 23–24: настоящая 26.3 и автоматизация                                      | Поддерживаемый MCProtocolLib 26.3/protocol 777, настоящий Paper 26.3-223, полная native/browser automation                                          |
| 25: сохранность пользовательских данных                                    | Только disposable БД/миры и отдельные Compose volumes; нет подключения к пользовательской `helicraft` и миграции постоянного мира; cleanup проверен |
| 26: AGENTS и парные справочники                                            | Root и четыре app AGENTS; EN/RU architecture, territorial workflow, development, product/readme и verification; проверка локальных ссылок           |

Итоговые исходники включают сгенерированные Альхену/OpenAPI и проверенные миграции 0045–0047. Выполнены build, typecheck, строгий lint, formatting, 226 unit-тестов, Java build/JUnit/style, spatial SQL/API, существующие domain integrations, native/browser, девять Compose-описаний и документационные ссылки. Матрица не утверждает ручную графическую приёмку и production deployment.

Сохранённые и визуально проверенные актуальные скриншоты:

- [Политическая карта — desktop](assets/territories-2026-10-26/political-map-desktop.png) и [mobile](assets/territories-2026-10-26/political-map-mobile.png).
- [Редактор территории — desktop](assets/territories-2026-10-26/territory-editor-desktop.png) и [mobile](assets/territories-2026-10-26/territory-editor-mobile.png).
- Настоящий тайл squaremap [до](assets/territories-2026-10-26/squaremap-before.png), [после явного render](assets/territories-2026-10-26/squaremap-after.png) и [после автоматического background update](assets/territories-2026-10-26/squaremap-background.png). SHA-256 соответственно: `40b49735ebac0e9fb565d82078d6026b608715e98724ca0236b28786d3800083`, `2c6cc6ad5c1cb356bee7f57dfc8bc4298c5f1e3bac1c190e23b5e67397372ecd`, `ab7a8ebda4d048724bb146a5b692d9035805d08acfed5c79176737ce398e25bc`.

Ручное продолжение: обычным графическим клиентом 26.3 пройти [изолированную приёмку](../development/minecraft-plugins_RU.md#приёмка-обычным-клиентом), визуально оценить titles/поверхность и повторить путь карта→ратификация→граница. Backup/restore/migration постоянного мира и TPS-бенчмарк fullrender большого мира — процедуры оператора, здесь не выполненные. Тестовый мир отрисован ограниченно; отсутствие соседних тайлов ожидаемо и явно обозначено. V1 реализует Overworld-юрисдикцию и уведомления; private claims, protection/enforcement и автоматическое территориальное налогообложение вне объёма. Spatial degradation не ослабляет connection-bound fail-closed авторизацию.

Итоговая документационная проверка охватила 859 локальных Markdown-ссылок/изображений и heading anchors; все разрешаются после исправления новой ссылки на ручную приёмку. Корневой formatting и `git diff --check` прошли.

## Follow-up — automatic Overworld registration, 2026-10-26

Область: текущее рабочее дерево на основе `3feabab`, включая изменения входа по ссылке. Денеб явно запрашивает обнаружение основного Overworld при синхронизации. Ручная административная регистрация в native-тесте не использовалась: `tests/minecraft/territories.ts` прочитал публичный список миров, проверил наличие ровно одного автоматически зарегистрированного Overworld и совпадение Paper UUID с настоящим журналом Денеба до полной юридической/карточной/игровой процедуры.

Успешно выполнены: корневой `build:ts` (через `test:minecraft`), TS7 `typecheck`, строгие `lint` и `format:check`, `test:unit` (229 тестов), Gradle builds/checks minecraft-client, Ригеля и Денеба, целевые integration suites обнаружения миров и spatial API (4 теста). Новые случаи проверяют credentials/роль/cookies, отсутствие регистрации для читающих запросов и Nether/End, неправильные/повторные основные identity, конкурентную идемпотентность без аккаунта администратора, сохранение настроек карты, неизменяемость сервисного аудита, отдельные UUID пересозданных миров, пустую начальную геометрию, устаревшие запросы выведенных миров и изоляцию backend. Миграция `0049_spatial_world_discovery.sql` проверена и применена на новых тестовых БД; schema push не использовался.

Полный `bun run test:minecraft` прошёл. Папка: `/tmp/helicraft-minecraft-v1-CfjqWe`; [точный сохранённый результат](assets/territories-2026-10-26/world-discovery-result.json). Настоящие Paper 26.3/protocol 777, тайлы squaremap, редактор/Governance/ратификация/public SSR/mobile, движение/транспорт/измерения, восстановление ревизий, ссылки подтверждения, отказы допуска, crash expiry, перезапуски и восстановление прошли без page errors. Постоянный Minecraft Compose-проект не запускался; пользовательские миры/БД не менялись. Приёмка человеком в графическом клиенте и production deployment остаются отдельными проверками.

Актуальная [пошаговая инструкция подключения мира](../states/territories_RU.md#world-connection) заменяет прежнее требование вручную копировать UUID/dimension для стандартного основного Overworld. Ручная форма сохранена для дополнительной настройки; новый физический UUID не получает прежних границ.

## Follow-up — editable territory procedure, 2026-10-26

Обращение пользователя выявило отсутствие `CHANGE_TERRITORY` в каталоге процедур Веги. Бэкенд уже проверял это действие, но форма реформы не позволяла его настроить. Теперь действие доступно в **9. Государственные решения → Общие государственные решения → Изменение территории**. Каталог действий и список необязательных процедур используют одно определение; в существующее устройство процедура автоматически не добавляется. Подсказка редактора различает неактивное государство, отсутствие процедуры и отсутствие полномочия должности/гражданства и описывает публикацию реформы.

Свежие проверки исправления UI: `build:ts`, TS7 `typecheck`, строгий `lint`, `test:unit` (230 тестов), `playwright test tests/e2e/territory-policy.spec.ts` (development и production, 2 passed). Настоящий браузер начинает с активного государства без процедуры, настраивает одну действующую должность через форму реформы, ждёт автосохранения, перезагружает страницу и проверяет HTTP 403 до публикации. Затем получает действующее одобрение должности, публикует реформу и проверяет доступность редактора и HTTP 200. Результаты native Minecraft выше относятся к отдельным прежним прогонам; для этого изменения только фронтенда native-тесты не повторялись.
