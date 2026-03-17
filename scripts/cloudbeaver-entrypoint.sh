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

cd /opt/cloudbeaver
exec ./launch-product.sh
