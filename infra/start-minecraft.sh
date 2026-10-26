#!/bin/sh
set -eu
: "${FORWARDING_SECRET:?Set FORWARDING_SECRET}"
case "$FORWARDING_SECRET" in *[!a-zA-Z0-9]*) echo 'FORWARDING_SECRET must be alphanumeric' >&2; exit 1;; esac
mkdir -p plugins
cp "/opt/$HELI_SERVICE.jar" "plugins/$HELI_SERVICE.jar"
if [ "$HELI_SERVICE" = deneb ]; then
  if [ "${EULA:-false}" != true ]; then echo 'Accept the Minecraft EULA by setting EULA=true' >&2; exit 1; fi
  printf 'eula=true\n' > eula.txt
  cp bootstrap/server.properties server.properties
  cp /opt/squaremap.jar plugins/squaremap.jar
  mkdir -p plugins/squaremap
  cp /opt/squaremap-config.yml plugins/squaremap/config.yml
  mkdir -p config
  sed "s/__FORWARDING_SECRET__/$FORWARDING_SECRET/g" bootstrap/paper-global.yml > config/paper-global.yml
else
  cp bootstrap/velocity.toml velocity.toml
  cp /opt/limboapi.jar plugins/limboapi.jar
  mkdir -p plugins/limboapi
  cp /opt/limbo-config.yml plugins/limboapi/config.yml
  printf '%s' "$FORWARDING_SECRET" > forwarding.secret
fi
exec java -Xms"${JAVA_XMS:-512M}" -Xmx"${JAVA_XMX:-2G}" -Dterminal.jline=false -Dterminal.ansi=false -jar /opt/server.jar
