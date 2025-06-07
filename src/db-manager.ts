import { join } from 'path';
import { exists, chmod, mkdir, writeFile, cp, rmdir } from 'fs/promises';
import { type ChildProcessWithoutNullStreams, exec, spawn } from 'child_process';
import { promisify } from 'util';

const DEFAULT_LEGION_TMP_DIR = 'tmp_legion';
const DEFAULT_POSTGRES_DIR = '/lib/postgresql/16/bin/';
const DEFAULT_POSTGRES_STARTING_PORT = 20100;

export const baseConfig = {
  tmpDir: DEFAULT_LEGION_TMP_DIR,
  postgresBinPath: DEFAULT_POSTGRES_DIR,
  startingPort: DEFAULT_POSTGRES_STARTING_PORT,
  instanceCount: 1,
};

const pgConfig = `
max_connections = 100
shared_buffers = 128MB
unix_socket_directories = ''
`.trim();

export type SetupPostgresConfig = Exclude<Partial<typeof baseConfig>, 'instanceCount'>;

/// Creates the basis for postgres configuration that will be cloned
export async function setupPostgresPrefab(config: typeof baseConfig) {

  if (!await exists(join(config.postgresBinPath, 'postgres'))) {
    throw new Error(`Invalid postgres bin directory "${config.postgresBinPath}"`);
  }

  const fullRuntimePath = join(process.env.PWD || '', config.tmpDir);
  const fullPrefabPath = join(fullRuntimePath, 'db_prefab');
  const configPath = join(fullPrefabPath, 'postgresql.conf');

  if (!await exists(fullPrefabPath)) {
    await mkdir(fullRuntimePath, { recursive: true });
    await promisify(exec)(`${config.postgresBinPath}/initdb -D ${fullPrefabPath}`);
    await writeFile(configPath, pgConfig, 'utf8');
  }
}

export async function allocatePostgresInstances(config: typeof baseConfig) {
  const fullRuntimePath = join(process.env.PWD || '', config.tmpDir);
  await mkdir(fullRuntimePath, { recursive: true });
  const fullPrefabPath = join(fullRuntimePath, 'db_prefab');
  const instancesPath = join(fullRuntimePath, 'db_instance');

  if (await exists(instancesPath)) {
    await rmdir(instancesPath, { recursive: true });
  }

  await mkdir(instancesPath, { recursive: true });
  const newMode = 0o700;

  let processes: ChildProcessWithoutNullStreams[] = [];

  for (let i = 0; i < config.instanceCount; i++) {
    const instancePath = join(instancesPath, 'db' + i);

    const run = async () => {
      await cp(fullPrefabPath, instancePath, { recursive: true });
      await chmod(instancePath, newMode);
      const port = config.startingPort + i;
      const proc = spawn(join(config.postgresBinPath, '/postgres'), ['-D', instancePath, '-c', 'port=' + port]);

      if (process.env.VERBOSE) {
        proc.stdout.pipe(process.stdout);
        proc.stderr.pipe(process.stderr);

        proc.on('exit', (code) => {
          console.log('DB EXIT', code);
        });
      }
      processes.push(proc);
    };
    run();
  }

  return processes;
}

export async function dbTeardown(processes: ChildProcessWithoutNullStreams[]) {
  
  let exitPromises: Promise<void>[] = [];

  for (const proc of processes) {
    proc.kill();
    exitPromises.push(new Promise(resolve => proc.on('exit', (_code) => {
      resolve();
    })));
  }

  await Promise.all(exitPromises);
}

export async function dbSetup(partialConfig: SetupPostgresConfig) {
  const config = Object.assign({}, baseConfig, partialConfig);

  await setupPostgresPrefab(config);
  const processes = await allocatePostgresInstances(config);

  // wait for the db to be ready
  await new Promise(resolve => setTimeout(() => resolve(null), 500));

  return processes;
}

