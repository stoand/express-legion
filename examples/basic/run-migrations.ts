import { migrate } from './migrations';

migrate();

console.log('Ran migrations to create user table');
