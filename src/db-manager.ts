import { join } from 'path';
import { exists, mkdir, writeFile } from 'fs/promises';
import { execSync } from 'child_process';

const DEFAULT_LEGION_RUNTIME_DIR = 'legion_runtime';
const DEFAULT_POSTGRES_DIR = '/lib/postgresql/16/bin/';

const baseConfig = {
  runtimeDir: DEFAULT_LEGION_RUNTIME_DIR,
  postgresBinPath: DEFAULT_POSTGRES_DIR,
};

const pgConfig = `
    max_connections = 100
    shared_buffers = 128MB
`;

export type SetupPostgresConfig = Partial<typeof baseConfig>;

/// Creates the basis for postgres configuration that will be cloned
export async function setupPostgresPrefab(partialConfig: SetupPostgresConfig) {

  const config = Object.assign(baseConfig, partialConfig);

  if (!await exists(join(config.postgresBinPath, 'postgres'))) {
    throw new Error(`Invalid postgres bin directory "${config.postgresBinPath}"`);
  }

  const fullRuntimePath = join(process.env.PWD || '', 'legion_runtime');
  const fullPrefabPath = join(fullRuntimePath, 'db_prefab');
  const configPath = join(fullPrefabPath, 'postgresql.conf');

  if (!await exists(fullPrefabPath)) {
    await mkdir(fullRuntimePath, { recursive: true });
    execSync(`${config.postgresBinPath}/initdb -D ${fullPrefabPath}`);
    await writeFile(configPath, pgConfig, 'utf8');
  }

  console.log('done');
}

setupPostgresPrefab({});

// allocatePostgresInstances();
