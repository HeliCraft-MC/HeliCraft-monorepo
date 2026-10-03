#!/bin/sh
set -eu
: "${FORWARDING_SECRET:?Set FORWARDING_SECRET}"
case "$FORWARDING_SECRET" in *[!a-zA-Z0-9]*) echo 'FORWARDING_SECRET must be alphanumeric' >&2; exit 1;; esac
mkdir -p plugins
cp "/opt/$HELI_SERVICE.jar" "plugins/$HELI_SERVICE.jar"
if [ "$HELI_SERVICE" = deneb ]; then
  if [ "${EULA:-false}" != true ]; then echo 'Accept the Minecraft EULA by setting EULA=true' >&2; exit 1; fi
  printf 'eula=true\n' > eula.txt
  test -f server.properties || cp bootstrap/server.properties server.properties
  mkdir -p config
  sed "s/__FORWARDING_SECRET__/$FORWARDING_SECRET/g" bootstrap/paper-global.yml > config/paper-global.yml
else
  test -f velocity.toml || cp bootstrap/velocity.toml velocity.toml
  printf '%s' "$FORWARDING_SECRET" > forwarding.secret
fi
exec java -Xms"${JAVA_XMS:-512M}" -Xmx"${JAVA_XMX:-2G}" -jar /opt/server.jar
