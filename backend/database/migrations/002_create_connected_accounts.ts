import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('connected_accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('platform', ['youtube', 'instagram']).notNullable();
    table.text('access_token').notNullable();
    table.text('refresh_token');
    table.timestamp('expires_at');
    table.jsonb('account_details');
    table.timestamps(true, true);
    table.unique(['user_id', 'platform']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('connected_accounts');
}
