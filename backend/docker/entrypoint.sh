#!/bin/sh
set -e

cd /var/www/html

sync_env_value() {
  key="$1"
  value="$2"

  if [ -z "$value" ]; then
    return
  fi

  if grep -q "^${key}=" .env 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '\n%s=%s\n' "$key" "$value" >> .env
  fi
}

if [ ! -f .env ] && [ -f .env.docker.example ]; then
  cp .env.docker.example .env
fi

sync_env_value "APP_URL" "$APP_URL"
sync_env_value "CORS_ALLOWED_ORIGINS" "$CORS_ALLOWED_ORIGINS"
sync_env_value "DB_CONNECTION" "$DB_CONNECTION"
sync_env_value "DB_HOST" "$DB_HOST"
sync_env_value "DB_PORT" "$DB_PORT"
sync_env_value "DB_DATABASE" "$DB_DATABASE"
sync_env_value "DB_USERNAME" "$DB_USERNAME"
sync_env_value "DB_PASSWORD" "$DB_PASSWORD"

if [ ! -f vendor/autoload.php ]; then
  composer install
fi

if grep -q '^APP_KEY=$' .env 2>/dev/null; then
  php artisan key:generate --force
fi

rm -f .env.bak

exec "$@"
