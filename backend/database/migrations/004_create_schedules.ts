import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('schedules', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('video_id').notNullable().references('id').inTable('videos').onDelete('CASCADE');
    table.enum('platform', ['youtube', 'instagram', 'both']).notNullable();
    table.timestamp('publish_date').notNullable();
    table.enum('status', ['pending', 'published', 'failed']).defaultTo('pending');
    table.timestamps(true, true);
    table.index('video_id');
    table.index('status');
    table.index('publish_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('schedules');
}
