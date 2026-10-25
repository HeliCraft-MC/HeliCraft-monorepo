[English](README.md) | [HeliCraft](../../README_RU.md)

# Deneb

**Материализовать HeliCraft внутри Minecraft.**

Java 25 · Paper 26.2 · Gradle Kotlin DSL · Adventure · JTS · Caffeine

Deneb — тонкий адаптер Paper для будущих физических правил мира. `/deneb` отправляет приветствие Adventure; независимый от фреймворка `WorldGeometry` использует JTS и Caffeine. `ANTARES_URL` задаёт неблокирующую HTTP-проверку API. Работа с БД и защита игровых территорий пока не реализованы.

```sh
bun run build:deneb
bun run test:deneb
bun run dev:deneb
```

Нужен JDK 25. Артефакт: `apps/deneb/build/libs/deneb.jar`. Continuous mode Gradle пересобирает исходники, но не перезагружает работающий плагин. Paper API и Adventure — compile-only; JTS/Caffeine включаются и изолируются через Shadow. JUnit 5 проверяет пространственный примитив. Координаты здесь лежат в плоскости x/z Minecraft, в отличие от примерного SRID 4326 в PostGIS.

Сборка в контейнере из корня: `docker compose -f apps/deneb/compose.yml build deneb`. Compose использует только стадию `build` Dockerfile; jar плагина находится в образе по пути `/workspace/apps/deneb/build/libs/deneb.jar`. Minecraft-серверы не скачиваются и не запускаются, зависимости Antares не поднимаются. Установите jar на отдельно управляемый сервер и перезапустите его после изменения плагина.

Будущие задачи: границы, юрисдикции, защищённая собственность, физические учреждения, геология, залежи и реальные товары. Игровой процесс должен оставаться обычным Minecraft, а не набором меню.

Из корня: `bun run lint` и `bun run format:check`. Правила и исключения: [настройка проверок](../../docs/development/setup-research_RU.md).

## Название

Денеб — α Лебедя, звезда в созвездии Лебедя. [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/).
