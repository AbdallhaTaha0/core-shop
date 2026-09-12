import { checkDatabaseConnection } from '../db/sequelize';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: 'core-shop-api';
  database: 'connected' | 'disconnected';
}

export interface HealthResult {
  httpStatus: number;
  body: HealthStatus;
}

export async function getHealth(): Promise<HealthResult> {
  const database = await checkDatabaseConnection();
  if (database === 'connected') {
    return { httpStatus: 200, body: { status: 'ok', service: 'core-shop-api', database } };
  }
  return { httpStatus: 503, body: { status: 'degraded', service: 'core-shop-api', database } };
}
