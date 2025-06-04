import { getTestPaths } from './test-manager';
import { type SetupPostgresConfig, dbSetup, baseConfig as basePostgresConfig } from './db-manager';
import { join } from 'path';
import { readdir } from 'fs/promises';
import { Worker } from 'worker_threads';

export { getTestPaths } from './test-manager';
export type { SetupPostgresConfig } from './db-manager';

const DEFAULT_TEST_DIR = 'integration';
const DEFAULT_BUILD_DIR = 'legion_out';

const baseConfig = {
  testDir: DEFAULT_TEST_DIR,
  buildDir: DEFAULT_BUILD_DIR,
};

export type TestConfig = Partial<typeof baseConfig>;

export async function runTests(partialTestConfig: TestConfig, partialPostgresConfig: SetupPostgresConfig) {
  const testConfig = Object.assign({}, baseConfig, partialTestConfig);
  const postgresConfig = Object.assign({}, basePostgresConfig, partialTestConfig);

  const files = await getTestPaths(testConfig.testDir);

  postgresConfig.instanceCount = files.length;
  await dbSetup(postgresConfig);

  console.log('awaiting connections');

  await new Promise(resolve => {

    let completedWorkers = 0;
    let failedTests = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const worker = new Worker(file, {
        env: {
          POSTGRES_URL:
            `postgresql://andreas@127.0.0.1:${(postgresConfig.startingPort || 0) + i}/postgres`
        }
      });

      worker.on('error', (error) => {
        console.error(error);
      });

      worker.on('exit', (code) => {
        if (code != 0) {
          failedTests += 1;
        }
        completedWorkers += 1;
        if (completedWorkers === files.length) {
          resolve(null);
          console.log(`Tests done: ${files.length - failedTests} of ${files.length} succeeded`);
        }
      });
    }
  });
}
