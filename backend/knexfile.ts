import type { Knex } from 'knex';
import config from './src/config';

const knexConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: config.database.url || {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
    },
    migrations: {
      directory: './database/migrations',
    },
    seeds: {
      directory: './database/seeds',
    },
  },
  production: {
    client: 'pg',
    connection: config.database.url,
    migrations: {
      directory: './database/migrations',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

module.exports = knexConfig;
