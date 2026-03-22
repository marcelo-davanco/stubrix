#!/bin/sh
set -e

TEMPLATE="/opt/cloudbeaver/conf-template/cloudbeaver.conf.template"
OUTPUT="/opt/cloudbeaver/conf/cloudbeaver.conf"

export CLOUDBEAVER_WORKSPACE_DIR="${CLOUDBEAVER_WORKSPACE_DIR:-/opt/cloudbeaver/workspace}"
export CLOUDBEAVER_CONTENT_ROOT="${CLOUDBEAVER_CONTENT_ROOT:-/opt/cloudbeaver/web}"
export CLOUDBEAVER_DRIVERS_DIR="${CLOUDBEAVER_DRIVERS_DIR:-/opt/cloudbeaver/drivers}"
export CLOUDBEAVER_ROOT_URI="${CLOUDBEAVER_ROOT_URI:-/}"
export CLOUDBEAVER_PRODUCT_CONF="${CLOUDBEAVER_PRODUCT_CONF:-/opt/cloudbeaver/conf/product.conf}"
export CLOUDBEAVER_SESSION_EXPIRE="${CLOUDBEAVER_SESSION_EXPIRE:-1800000}"
export CLOUDBEAVER_ANONYMOUS_ACCESS="${CLOUDBEAVER_ANONYMOUS_ACCESS:-true}"
export CLOUDBEAVER_CUSTOM_CONNECTIONS="${CLOUDBEAVER_CUSTOM_CONNECTIONS:-true}"

envsubst < "$TEMPLATE" > "$OUTPUT"

RUNTIME_CONF="${CLOUDBEAVER_WORKSPACE_DIR}/.data/.cloudbeaver.runtime.conf"
if [ -f "$RUNTIME_CONF" ]; then
  sed -i 's/"forceHttps"\s*:\s*true/"forceHttps": false/g' "$RUNTIME_CONF"
fi

DATASRC_DIR="${CLOUDBEAVER_WORKSPACE_DIR}/GlobalConfiguration/.dbeaver"
DATASRC_FILE="${DATASRC_DIR}/data-sources.json"
DATASRC_TEMPLATE="/opt/cloudbeaver/conf-template/data-sources.json"

if [ ! -f "$DATASRC_FILE" ] && [ -f "$DATASRC_TEMPLATE" ]; then
  mkdir -p "$DATASRC_DIR"
  export PG_EXTERNAL_PORT="${PG_EXTERNAL_PORT:-5542}"
  export PG_DATABASE="${PG_DATABASE:-postgres}"
  export PG_USER="${PG_USER:-postgres}"
  export PG_PASSWORD="${PG_PASSWORD:-postgres}"
  export MYSQL_PORT="${MYSQL_PORT:-3306}"
  export MYSQL_DATABASE="${MYSQL_DATABASE:-stubrix}"
  export MYSQL_USER="${MYSQL_USER:-stubrix}"
  export MYSQL_PASSWORD="${MYSQL_PASSWORD:-stubrix}"
  envsubst < "$DATASRC_TEMPLATE" > "$DATASRC_FILE"
fi

cd /opt/cloudbeaver
exec ./launch-product.sh
