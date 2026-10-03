FROM oven/bun:1.4.2 AS download
WORKDIR /download
COPY apps/rigel/server-lock.json ./server-lock.json
COPY infra/download-server.ts ./download-server.ts
RUN bun download-server.ts

FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace
COPY gradlew gradlew.bat settings.gradle.kts build.gradle.kts gradle.properties ./
COPY gradle ./gradle
COPY config ./config
COPY apps/deneb ./apps/deneb
COPY apps/rigel ./apps/rigel
RUN ./gradlew :rigel:shadowJar --no-daemon

FROM eclipse-temurin:25-jre
RUN useradd -m -u 10001 helicraft && mkdir -p /data/plugins && chown -R helicraft:helicraft /data
WORKDIR /data
COPY --from=download /download/server.jar /opt/server.jar
COPY --from=build /workspace/apps/rigel/build/libs/rigel.jar /opt/rigel.jar
COPY apps/rigel/docker/ ./bootstrap/
COPY infra/start-minecraft.sh /opt/start.sh
RUN chmod +x /opt/start.sh
USER helicraft
EXPOSE 25565
ENV HELI_SERVICE=rigel
ENTRYPOINT ["/opt/start.sh"]
