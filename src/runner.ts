import { Worker } from 'worker_threads';
import { type SetupPostgresConfig, baseConfig as basePostgresConfig, dbSetup, dbTeardown } from './db-manager';
import { getTestPaths } from './test-manager';

export type { SetupPostgresConfig } from './db-manager';
export { getTestPaths } from './test-manager';

const DEFAULT_TEST_DIR = 'integration';
const DEFAULT_BUILD_DIR = 'legion_out';

const baseConfig = {
  testDir: DEFAULT_TEST_DIR,
  buildDir: DEFAULT_BUILD_DIR,
};

export type TestConfig = Partial<typeof baseConfig>;

export async function runTests(partialTestConfig: TestConfig, partialPostgresConfig: SetupPostgresConfig) {
  const testConfig = Object.assign({}, baseConfig, partialTestConfig);
  const postgresConfig = Object.assign({}, basePostgresConfig, partialPostgresConfig);

  const files = await getTestPaths(testConfig.testDir);

  postgresConfig.instanceCount = files.length;
  const dbProcesses = await dbSetup(postgresConfig);

  console.log('awaiting onnections');

  await new Promise(async resolve => {

    let completedWorkers = 0;
    let failedTests = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const worker = new Worker(file, {
        workerData: {
          postgresUrl:
            `postgresql://${process.env.USER}@127.0.0.1:${(postgresConfig.startingPort || 0) + i}/postgres`
        },
      });

      worker.on('error', (error) => {
        console.error(error);
      });

      worker.on('exit', async (code) => {
        console.log('exit', code);
        if (code != 0) {
          failedTests += 1;
        }
        completedWorkers += 1;
        if (completedWorkers === files.length) {
          resolve(null);
          await dbTeardown(dbProcesses);
          new Promise(resolve => setTimeout(() => resolve(null), 200));
          console.log(`Tests done: ${files.length - failedTests} of ${files.length} succeeded`);
        }
      });
    }
  });
}
