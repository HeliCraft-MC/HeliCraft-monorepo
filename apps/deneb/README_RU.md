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

Продакшен из корня: `docker compose --env-file .env -f apps/deneb/compose.yml up -d --build`. Запускаются Deneb, Rigel и зависимости API. Самостоятельно прочтите/примите Minecraft EULA и задайте `EULA=true`; используйте общий случайный буквенно-цифровой `FORWARDING_SECRET` для Paper/Velocity. Paper не публикует порт наружу: вход через Velocity на 25565, modern forwarding защищает backend в offline mode. Серверные jar закреплены в `server-lock.json` и проверяются SHA-256 при сборке образа. Bootstrap обновляет forwarding-конфигурацию при запуске; мир и постоянные настройки сервера находятся в томе. После изменения плагина пересобирайте и перезапускайте контейнеры.

Будущие задачи: границы, юрисдикции, защищённая собственность, физические учреждения, геология, залежи и реальные товары. Игровой процесс должен оставаться обычным Minecraft, а не набором меню.

Из корня: `bun run lint` и `bun run format:check`. Правила и исключения: [настройка проверок](../../docs/setup-research_RU.md).

## Название

Денеб — α Лебедя, звезда в созвездии Лебедя. [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/).
