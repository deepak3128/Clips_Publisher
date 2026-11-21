import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('clip_jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('source_type', 20).notNullable();
    table.text('source_value').notNullable();
    table.string('file_name');
    table.integer('clip_count').notNullable().defaultTo(3);
    table.jsonb('settings').defaultTo('{}');
    table.string('status', 30).notNullable().defaultTo('queued');
    table.integer('progress').notNullable().defaultTo(0);
    table.text('error_message');
    table.timestamps(true, true);
    table.index(['user_id', 'created_at']);
  });

  await knex.schema.createTable('clips', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('job_id').notNullable().references('id').inTable('clip_jobs').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('clip_index').notNullable();
    table.string('title');
    table.float('start_time').notNullable();
    table.float('end_time').notNullable();
    table.float('duration').notNullable();
    table.string('file_name').notNullable();
    table.text('file_url').notNullable();
    table.string('status', 20).notNullable().defaultTo('pending');
    table.timestamps(true, true);
    table.index(['job_id', 'clip_index']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('clips');
  await knex.schema.dropTableIfExists('clip_jobs');
}
