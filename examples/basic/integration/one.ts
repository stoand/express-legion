import { expect } from 'bun:test';
import { migrate } from '../migrations';

await migrate();

expect(1).toBe(1);