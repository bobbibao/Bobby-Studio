import { Client } from 'pg';

export default async function globalTeardown(): Promise<void> {
  const info = (globalThis as { __BOBBY_TEST_DB__?: { adminUrl: string; dbName: string } }).__BOBBY_TEST_DB__;
  if (!info) return;
  const admin = new Client({ connectionString: info.adminUrl });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${info.dbName} WITH (FORCE)`);
  await admin.end();
}
