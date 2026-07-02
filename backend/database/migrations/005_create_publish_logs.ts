import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('publish_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('video_id').notNullable().references('id').inTable('videos').onDelete('CASCADE');
    table.enum('platform', ['youtube', 'instagram']).notNullable();
    table.string('publish_url');
    table.enum('status', ['pending', 'success', 'failed']).defaultTo('pending');
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    table.timestamps(true, true);
    table.index('video_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('publish_logs');
}
