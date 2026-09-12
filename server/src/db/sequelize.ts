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
    });
  }
  return instance;
}

export async function checkDatabaseConnection(): Promise<'connected' | 'disconnected'> {
  try {
    await getSequelize().authenticate();
    return 'connected';
  } catch {
    return 'disconnected';
  }
}
