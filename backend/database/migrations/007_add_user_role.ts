import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Stored as a string so new roles (for example, additional moderation
    // states) can be added without altering a PostgreSQL enum type.
    table.string('role', 20).notNullable().defaultTo('user');
    table.index('role');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropIndex('role');
    table.dropColumn('role');
  });
}
