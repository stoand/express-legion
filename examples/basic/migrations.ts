import * as dotenv from 'dotenv';
import { sql } from 'bun';

export async function migrate() {

  dotenv.config();

  await sql`DROP SCHEMA IF EXISTS public CASCADE;`;
  await sql`CREATE SCHEMA public;`;

  await sql`CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  );`;
}
