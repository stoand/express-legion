import * as dotenv from 'dotenv';
import { Pool } from 'pg';

export async function migrate() {
  dotenv.config();

  const pool = new Pool({
    connectionString: process.env.LEGION_POSTGRES_URL
  });

  await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await pool.query('CREATE SCHEMA public');
  await pool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    )
  `);

  await pool.end();
}
