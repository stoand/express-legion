import { Worker } from 'worker_threads';
import { type SetupPostgresConfig, baseConfig as basePostgresConfig, dbSetup, dbTeardown } from './db-manager';
import { getTestPaths } from './test-manager';
import { watch } from 'fs';
import { join } from 'path';

export type { SetupPostgresConfig } from './db-manager';
export { getTestPaths } from './test-manager';

const DEFAULT_TEST_DIR = 'integration';
const DEFAULT_BUILD_DIR = 'legion_out';

const baseConfig = {
  watchDir: null as string | null,
  testDir: DEFAULT_TEST_DIR,
  buildDir: DEFAULT_BUILD_DIR,
};

let initedWatcher = false;
let runAgainAsSoonAsPossible = false;

export type TestConfig = Partial<typeof baseConfig>;

export function initWatcher(watchDir: string) {
  const fullWatchDir = join(process.cwd(), watchDir);
  console.log('watching dir', fullWatchDir);
    watch(fullWatchDir, (_event, filename) => {
      if (filename && filename.endsWith('.ts')) {
        runAgainAsSoonAsPossible = true;
        console.log('run asap')
      }
    });
}

export async function runTests(partialTestConfig: TestConfig, partialPostgresConfig: SetupPostgresConfig) {

  const startTime = Date.now();

  const testConfig = Object.assign({}, baseConfig, partialTestConfig);
  const postgresConfig = Object.assign({}, basePostgresConfig, partialPostgresConfig);
  
  if (!initedWatcher && testConfig && testConfig.watchDir) {
    initWatcher(testConfig.watchDir);
  }

  const files = await getTestPaths(testConfig.testDir);

  postgresConfig.instanceCount = files.length;
  const dbProcesses = await dbSetup(postgresConfig);

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
          console.log(`Tests done: ${files.length - failedTests} of ${files.length} succeeded in ${endTime - startTime}ms`);
          await dbTeardown(dbProcesses);
          if (testConfig.watchDir) {
            
          } else {
            process.exit(failedTests > 0 ? 1 : 0);
          }
        }
      });
    }
  });
}
