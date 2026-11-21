import knex from 'knex';
import config from '../config';
import type { Knex } from 'knex';

let db: Knex;

export async function initializeDatabase(): Promise<Knex> {
  const knexConfig: Knex.Config = {
    client: 'pg',
    connection: config.database.url || {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
    },
    pool: {
      min: 2,
      max: 10,
    },
  };

  db = knex(knexConfig);
  return db;
}

export function getDatabase(): Knex {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
  }
}

export default getDatabase;
