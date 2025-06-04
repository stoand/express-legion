import { readdir } from 'fs/promises';
import { join } from 'path';

export async function getTestPaths(outerTestDir: string) {
  const testDir = join(process.env.PWD || '', outerTestDir);
  const files = await readdir(testDir);
  return files.map(file => join(testDir, file));
}
