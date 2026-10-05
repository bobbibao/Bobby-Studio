#!/usr/bin/env node
// PostgreSQL backup and restore verification.
//
//   node scripts/backup.mjs backup [--out backups/bobby-<timestamp>.dump]
//   node scripts/backup.mjs verify <dump>      restores into a throwaway database and compares row counts
//
// Uses DATABASE_URL from server-api/.env (or the environment). Never prints the connection string.
// Verification restores into a NEW database next to the source and drops it afterwards; the source is only read.
import { mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { ROOT, appDir, log, readEnvFile, run } from './lib/common.mjs';

const [command, ...rest] = process.argv.slice(2);
const databaseUrl = process.env.DATABASE_URL ?? readEnvFile(path.join(appDir('server-api'), '.env')).get('DATABASE_URL');
if (!databaseUrl) {
  log('DATABASE_URL is not set (server-api/.env or environment).');
  process.exit(1);
}
const withDb = (name) => {
  const url = new URL(databaseUrl);
  url.pathname = `/${name}`;
  return url.toString();
};
const sourceDb = new URL(databaseUrl).pathname.slice(1);
const TABLES = ['User', 'ImageRequest', 'ImageJob', 'CreditReservation', 'Asset', 'Attribute', 'UserAttribute', 'StudioSession', 'GenerationOutbox', 'Usage'];

function psql(url, sql) {
  const result = run('psql', [url, '-v', 'ON_ERROR_STOP=1', '-tAc', sql]);
  if (result.status !== 0) throw new Error(`psql failed: ${result.stderr.split('\n')[0]}`);
  return result.stdout.trim();
}

function counts(url) {
  return Object.fromEntries(TABLES.map((table) => [table, Number(psql(url, `SELECT count(*) FROM "${table}"`))]));
}

if (command === 'backup') {
  const out = rest[rest.indexOf('--out') + 1] ?? path.join(ROOT, 'backups', `bobby-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
  mkdirSync(path.dirname(out), { recursive: true });
  const result = run('pg_dump', ['--format=custom', '--no-owner', '--file', out, databaseUrl]);
  if (result.status !== 0) {
    log(`pg_dump failed: ${result.stderr.split('\n')[0]}`);
    process.exit(1);
  }
  log(`backup written: ${path.relative(ROOT, out)} (${statSync(out).size} bytes)`);
} else if (command === 'verify') {
  const dump = rest[0];
  if (!dump) {
    log('Usage: node scripts/backup.mjs verify <dump>');
    process.exit(1);
  }
  const scratch = `bobby_restore_${randomBytes(4).toString('hex')}`;
  const admin = withDb('postgres');
  try {
    psql(admin, `CREATE DATABASE ${scratch}`);
    const restore = run('pg_restore', ['--no-owner', '--dbname', withDb(scratch), dump]);
    if (restore.status !== 0 && !/already exists/.test(restore.stderr)) throw new Error(`pg_restore failed: ${restore.stderr.split('\n')[0]}`);
    const source = counts(databaseUrl);
    const restored = counts(withDb(scratch));
    const migrations = (url) => psql(url, `SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`);
    let ok = migrations(databaseUrl) === migrations(withDb(scratch));
    for (const table of TABLES) {
      // A backup taken earlier may legitimately have fewer rows than the live source; it must never have more.
      const good = restored[table] <= source[table];
      ok &&= good;
      log(`${table.padEnd(18)} source=${String(source[table]).padStart(6)} restored=${String(restored[table]).padStart(6)} ${good ? 'ok' : 'MISMATCH'}`);
    }
    // Lifecycle invariants must hold in the restored copy.
    const orphanReservations = Number(psql(withDb(scratch), `SELECT count(*) FROM "CreditReservation" r JOIN "ImageJob" j ON j.id = r."jobId" WHERE r.status = 'RESERVED' AND j.status IN ('COMPLETED','FAILED','CANCELLED')`));
    const capturedWithoutCompletion = Number(psql(withDb(scratch), `SELECT count(*) FROM "CreditReservation" r JOIN "ImageJob" j ON j.id = r."jobId" WHERE r.status = 'CAPTURED' AND j.status <> 'COMPLETED'`));
    log(`reservations held by finished jobs: ${orphanReservations}; captured without completion: ${capturedWithoutCompletion}`);
    ok &&= orphanReservations === 0 && capturedWithoutCompletion === 0;
    log(ok ? `\nRestore verified into ${scratch} (dropped).` : '\nRestore verification FAILED.');
    process.exitCode = ok ? 0 : 1;
  } finally {
    psql(admin, `DROP DATABASE IF EXISTS ${scratch} WITH (FORCE)`);
  }
  log(`source database: ${sourceDb} (read only)`);
} else {
  log('Usage: node scripts/backup.mjs <backup|verify> ...');
  process.exit(1);
}
