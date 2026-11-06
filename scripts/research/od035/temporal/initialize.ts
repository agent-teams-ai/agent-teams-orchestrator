import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';
import { output, sourceDir } from './paths.ts';

export type PgConfig = { host: string; port: number; user: string; password: string; database: string; connectionString: string };
function isPgConfig(value: unknown): value is PgConfig {
  return typeof value === 'object' && value !== null
    && 'host' in value && typeof value.host === 'string'
    && 'port' in value && typeof value.port === 'number'
    && 'user' in value && typeof value.user === 'string'
    && 'password' in value && typeof value.password === 'string'
    && 'database' in value && typeof value.database === 'string'
    && 'connectionString' in value && typeof value.connectionString === 'string';
}
function postgresConfig(): PgConfig {
  const connectionString = process.env.DATABASE_URL ?? process.env.SPIKE_DATABASE_URL;
  if (connectionString === undefined || connectionString === '') {
    const config: unknown = JSON.parse(readFileSync(process.env.PG_CONFIG_PATH ?? resolve(sourceDir, '../pg-config.json'), 'utf8'));
    if (!isPgConfig(config)) { throw new Error('Invalid PostgreSQL config shape'); }
    return config;
  }
  const url = new URL(connectionString);
  return { host: url.hostname, port: Number(url.port || '5432'), user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password), database: url.pathname.slice(1), connectionString };
}
export const pg = postgresConfig();
export const nativeBinary = (name: string): string => resolve(process.env.TEMPORAL_BIN_DIR ?? sourceDir, `${name}${process.platform === 'win32' ? '.exe' : ''}`);
export const dbName = 'temporal_spike_engine';
export const visibilityDbName = 'temporal_spike_visibility';
const rpc = (grpcPort: number, membershipPort: number) => ({ rpc: { grpcPort, membershipPort, bindOnLocalHost: true } });

export async function initialize(): Promise<void> {
  const admin = new Pool({ connectionString: pg.connectionString, max: 1 });
  try {
    for (const name of [dbName, visibilityDbName]) {
      if ((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount === 0) {
        await admin.query(`CREATE DATABASE ${name}`);
        const env = { ...process.env, SQL_HOST: pg.host, SQL_PORT: String(pg.port), SQL_USER: pg.user,
          SQL_PASSWORD: pg.password, SQL_DATABASE: name, SQL_PLUGIN: 'postgres12' };
        execFileSync(nativeBinary('temporal-sql-tool'), ['setup-schema', '-v', '0.0'], { env, stdio: 'pipe' });
        const schema = name === dbName ? 'temporal' : 'visibility';
        const sourceRoot = process.env.TEMPORAL_SOURCE_DIR ?? resolve(sourceDir, 'temporal-1.32.1');
        execFileSync(nativeBinary('temporal-sql-tool'), ['update-schema', '-d', resolve(sourceRoot, `schema/postgresql/v12/${schema}/versioned`)], { env, stdio: 'pipe' });
      }
    }
  } finally { await admin.end(); }
  const sql = (databaseName: string, maxConns: number) => ({ sql: {
    pluginName: 'postgres12', databaseName, connectAddr: `${pg.host}:${pg.port}`,
    connectProtocol: 'tcp', user: pg.user, password: pg.password,
    maxConns, maxIdleConns: maxConns, maxConnLifetime: '1h',
  } });
  const config = {
    log: { stdout: true, level: 'warn' },
    persistence: { defaultStore: 'postgres-default', visibilityStore: 'postgres-visibility', numHistoryShards: 4,
      datastores: { 'postgres-default': sql(dbName, 8), 'postgres-visibility': sql(visibilityDbName, 2) } },
    global: { membership: { maxJoinDuration: '30s', broadcastAddress: '127.0.0.1' } },
    services: { frontend: rpc(27233, 16933), matching: rpc(27235, 16935), history: rpc(27234, 16934), worker: rpc(27239, 16939) },
    clusterMetadata: { enableGlobalNamespace: false, failoverVersionIncrement: 10, masterClusterName: 'active',
      currentClusterName: 'active', clusterInformation: { active: { enabled: true, initialFailoverVersion: 1,
        rpcName: 'frontend', rpcAddress: '127.0.0.1:27233' } } },
    dcRedirectionPolicy: { policy: 'noop' },
    archival: { history: { state: 'disabled', enableRead: false }, visibility: { state: 'disabled', enableRead: false } },
    dynamicConfigClient: { filepath: output('dynamic-config.yaml'), pollInterval: '10s' },
  };
  writeFileSync(output('server-config.private.json'), JSON.stringify(config, null, 2), { mode: 0o600 });
  writeFileSync(output('dynamic-config.yaml'), '{}\n');
}
if (process.argv[1]?.endsWith('initialize.ts') === true) {
  await initialize();
  console.log('migrations-and-config-ready');
}
