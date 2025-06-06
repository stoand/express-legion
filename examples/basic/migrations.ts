import * as dotenv from 'dotenv';
import { SQL } from 'bun';

export async function migrate() {

  dotenv.config();

  const sql = new SQL({
    url: process.env.LEGION_POSTGRES_URL
  });

  console.log('dropping schema');

  await sql`DROP SCHEMA IF EXISTS public CASCADE;`;

  await sql`CREATE SCHEMA public;`;

  await sql`CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
  );`;
}
