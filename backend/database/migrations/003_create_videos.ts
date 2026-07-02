import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('videos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('caption');
    table.jsonb('hashtags').defaultTo('[]');
    table.string('thumbnail_url');
    table.string('file_url').notNullable();
    table.string('file_name').notNullable();
    table.bigInteger('file_size').notNullable();
    table.integer('duration'); // in seconds
    table.string('resolution');
    table.enum('status', ['draft', 'scheduled', 'publishing', 'published', 'failed']).defaultTo('draft');
    table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    table.index('user_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('videos');
}
