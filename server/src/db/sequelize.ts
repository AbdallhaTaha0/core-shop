import { Sequelize } from 'sequelize';
import { getEnv } from '../config/env';

// Single shared Sequelize instance. Schema is managed exclusively through
// migrations — never `sequelize.sync({ alter: true })`.
let instance: Sequelize | undefined;

export function getSequelize(): Sequelize {
  if (instance === undefined) {
    const env = getEnv();
    instance = new Sequelize(env.DATABASE_URL, {
      dialect: 'postgres',
      logging: env.NODE_ENV === 'development' ? console.log : false,
      define: {
        // Convention for all future models: snake_case columns.
        underscored: true,
      },
      // Managed Postgres providers (Neon, etc.) require TLS. Enable SSL only
      // for non-local hosts so `docker compose` / localhost dev stays plain.
      // Triggered by `?sslmode=require` in DATABASE_URL, a known Neon host,
      // or production + non-local host as a safety net.
      dialectOptions: needsSsl(env.DATABASE_URL)
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
    });
  }
  return instance;
}

/**
 * Returns true when the database host requires TLS.
 * Local hosts (localhost, 127.0.0.1, ::1, `db` compose service) never use SSL.
 */
function needsSsl(databaseUrl: string): boolean {
  let host: string | undefined;
  try {
    host = new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === 'db';
  if (isLocal) {
    return false;
  }
  const lowerUrl = databaseUrl.toLowerCase();
  if (lowerUrl.includes('sslmode=require')) {
    return true;
  }
  // Neon pooler / direct hosts (e.g. *.neon.tech) always need TLS.
  if (host.includes('neon.tech')) {
    return true;
  }
  return getEnv().NODE_ENV === 'production';
}

export async function checkDatabaseConnection(): Promise<'connected' | 'disconnected'> {
  try {
    await getSequelize().authenticate();
    return 'connected';
  } catch {
    return 'disconnected';
  }
}
