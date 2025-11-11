import knex from 'knex';
import type { Knex } from 'knex';
import { config } from '../config.js';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Création du dossier si nécessaire
const ensureDir = () => {
  const dir = dirname(config.dbFile);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};
ensureDir();

// Initialisation de knex avec SQLite3
export const db: Knex = knex({
  client: 'sqlite3',
  connection: {
    filename: config.dbFile,
  },
  useNullAsDefault: true,
});

// Création des tables si elles n'existent pas
async function createTables() {
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (table) => {
      table.text('jid').primary();
      table.text('name');
      table.text('role');
      table.integer('first_seen');
    });
  }

  if (!(await db.schema.hasTable('messages'))) {
    await db.schema.createTable('messages', (table) => {
      table.text('id').primary();
      table.text('jid');
      table.text('group_id');
      table.text('body');
      table.text('media_path');
      table.integer('timestamp');
      table.integer('deleted_flag').defaultTo(0);
    });
  }

  if (!(await db.schema.hasTable('groups'))) {
    await db.schema.createTable('groups', (table) => {
      table.text('id').primary();
      table.text('subject');
      table.integer('created_at');
    });
  }

  if (!(await db.schema.hasTable('moderation_logs'))) {
    await db.schema.createTable('moderation_logs', (table) => {
      table.increments('id').primary();
      table.text('jid');
      table.text('action');
      table.text('reason');
      table.integer('timestamp');
    });
  }
}

// Création des tables au démarrage
createTables().catch(console.error);

// Fonctions utilitaires

export const createOrUpdateUser = async (jid: string, name: string, role = 'member') => {
  const user = await db('users').where({ jid }).first();
  const first_seen = user?.first_seen || Date.now();

  await db('users')
    .insert({ jid, name, role, first_seen })
    .onConflict('jid')
    .merge();
};

export const saveMessage = async (
  id: string,
  jid: string,
  groupId: string | null,
  body: string | null,
  mediaPath: string | null
) => {
  await db('messages')
    .insert({
      id,
      jid,
      group_id: groupId,
      body: body || '',
      media_path: mediaPath || null,
      timestamp: Date.now(),
    })
    .onConflict('id')
    .merge();
};

export const logModeration = async (jid: string, action: string, reason: string) => {
  await db('moderation_logs').insert({
    jid,
    action,
    reason,
    timestamp: Date.now(),
  });
};

export default db;
