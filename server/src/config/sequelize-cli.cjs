// sequelize-cli configuration (tooling only). The application itself reads
// configuration exclusively through src/config/env.ts; this file exists so
// `npm run db:migrate*` resolves the same database without duplicating
// connection logic into JSON. Defaults match docker-compose.yml local dev.
require('dotenv').config(); // loads server/.env when scripts run from server/
function fromUrl(rawUrl) {
  const url = new URL(rawUrl);
  return {
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    dialect: 'postgres',
  };
}

function forEnv() {
  if (process.env.DATABASE_URL) {
    return fromUrl(process.env.DATABASE_URL);
  }
  return {
    username: process.env.POSTGRES_USER || 'coreshop',
    password: process.env.POSTGRES_PASSWORD || 'coreshop-dev-only',
    database: process.env.POSTGRES_DB || 'coreshop',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    dialect: 'postgres',
  };
}

const base = forEnv();

module.exports = {
  development: { ...base },
  // The isolated test database. An explicit TEST_DATABASE_URL wins so CI and
  // machines with a custom DB_HOST_PORT do not depend on naming conventions.
  test: process.env.TEST_DATABASE_URL
    ? fromUrl(process.env.TEST_DATABASE_URL)
    : { ...base, database: `${base.database}_test` },
  production: { ...base, dialectOptions: { ssl: false } },
};
