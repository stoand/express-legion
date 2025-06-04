import express from 'express';
import * as dotenv from 'dotenv';
import { sql } from 'bun';

export async function initApp() {

  dotenv.config();

  const app = express();
  
  app.get('/create-user', async (req, res) => {
    let result = await sql`INSERT INTO users VALUES(DEFAULT, ${req.query.name}, ${req.query.email});`;
    res.end(JSON.stringify(result));
  });

  app.get('/users', async (_req, res) => {
    let users = await sql`SELECT * FROM users;`;

    res.send(JSON.stringify(users));
  });

  return app;
}
