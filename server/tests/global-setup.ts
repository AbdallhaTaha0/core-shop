import { execSync } from 'node:child_process';
import { Client } from 'pg';

// Runs once per test process before any test file loads:
// 1. Creates the isolated `*_test` database if it does not exist yet.
// 2. Applies all migrations to it, so tests always run against the current
//    schema (fresh clone + `npm test` just works).
const DEFAULT_TEST_URL = 'postgres://coreshop:coreshop-dev-only@127.0.0.1:5432/coreshop_test';

function parseTarget(): { adminUrl: string; dbName: string; testUrl: string } {
  const testUrl = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_URL;
  const url = new URL(testUrl);
  const dbName = url.pathname.replace(/^\//, '');
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error(`Refusing to create database with unexpected name: "${dbName}"`);
  }
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = '/postgres';
  return { adminUrl: adminUrl.toString(), dbName, testUrl };
}

export default async function globalSetup(): Promise<void> {
  const { adminUrl, dbName, testUrl } = parseTarget();
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.end();
  }
  execSync('npx sequelize-cli db:migrate --env test', {
    stdio: 'inherit',
    env: { ...process.env, TEST_DATABASE_URL: testUrl },
  });
}
