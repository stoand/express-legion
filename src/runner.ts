import { Worker } from 'worker_threads';
import { type SetupPostgresConfig, baseConfig as basePostgresConfig, dbSetup, dbTeardown } from './db-manager';
import { getTestPaths } from './test-manager';
import { type ChildProcessWithoutNullStreams } from 'child_process';

export type { SetupPostgresConfig } from './db-manager';
export { getTestPaths } from './test-manager';

const DEFAULT_TEST_DIR = 'integration';

const baseConfig = {
  testDir: DEFAULT_TEST_DIR,
};

export type TestConfig = Partial<typeof baseConfig>;

export async function runTests(partialTestConfig: TestConfig, partialPostgresConfig: SetupPostgresConfig) {
  
  let dbProcesses: ChildProcessWithoutNullStreams[] | undefined = undefined;
  let someTestsFailed = false;

  function gracefulShutdown() {
    if (dbProcesses) {
      dbTeardown(dbProcesses);
    }
    process.exit(someTestsFailed ? 1 : 0);
  }

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  process.once('SIGUSR2', gracefulShutdown);
  
  const startTime = Date.now();

  // Grace period for killed processes to exit
  await new Promise(resolve => setTimeout(resolve, 300));

  const testConfig = Object.assign({}, baseConfig, partialTestConfig);
  const postgresConfig = Object.assign({}, basePostgresConfig, partialPostgresConfig);

  const files = await getTestPaths(testConfig.testDir);

  postgresConfig.instanceCount = files.length;
  dbProcesses = await dbSetup(postgresConfig);

  await new Promise(async resolve => {

    let completedWorkers = 0;
    let failedTests = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) {
        throw new Error('No file found');
      }

      const postgresUrl = `postgresql://${process.env.USER}@127.0.0.1:${(postgresConfig.startingPort || 0) + i}/postgres`

      const worker = new Worker(file, {
        env: {
          LEGION_POSTGRES_URL: postgresUrl
        },
        workerData: {
          postgresUrl
            
        },
      });

      let foundError = false;

      worker.on('error', (error) => {
        console.error(error);
        foundError = true;
      });

      worker.on('exit', async (code) => {
        if (code != 0 || foundError) {
          failedTests += 1;
        }
        completedWorkers += 1;
        if (completedWorkers === files.length) {
          resolve(null);
          const endTime = Date.now();
          someTestsFailed = failedTests > 0;
          console.log(`Tests done: ${files.length - failedTests} of ${files.length} succeeded in ${endTime - startTime}ms`);
          await dbTeardown(dbProcesses);
          process.exit(someTestsFailed ? 1 : 0);
        }
      });
    }
  });
}
