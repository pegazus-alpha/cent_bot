/**
 * Service de gestion des paramètres de groupes
 * - Messages de bienvenue personnalisés
 * - Activation/désactivation par groupe
 */

import { db } from './db.js';

export interface GroupSetting {
  group_id: string;
  group_name: string;
  welcome_enabled: boolean;
  welcome_message: string;
  goodbye_enabled: boolean;
  goodbye_message: string;
  created_at: number;
  updated_at: number;
}

// Cache pour performance
let groupCache: Map<string, GroupSetting> = new Map();

/**
 * Initialise la table group_welcome_settings
 */
export async function initGroupSettingsTable() {
  const exists = await db.schema.hasTable('group_welcome_settings');
  if (!exists) {
    await db.schema.createTable('group_welcome_settings', (table) => {
      table.text('group_id').primary();
      table.text('group_name');
      table.boolean('welcome_enabled').defaultTo(false);
      table.text('welcome_message').defaultTo('Bienvenue @user dans le groupe @group');
      table.boolean('goodbye_enabled').defaultTo(false);
      table.text('goodbye_message').defaultTo('Au revoir @user, à la prochaine !');
      table.integer('created_at');
      table.integer('updated_at');
    });
    console.log('✅ Table group_welcome_settings créée');
  } else {
    // Vérifier et ajouter les colonnes si elles manquent
    const hasWelcomeMessage = await db.schema.hasColumn('group_welcome_settings', 'welcome_message');
    if (!hasWelcomeMessage) {
      await db.schema.alterTable('group_welcome_settings', (table) => {
        table.text('welcome_message').defaultTo('Bienvenue @user dans le groupe @group');
      });
    }
    const hasGoodbyeEnabled = await db.schema.hasColumn('group_welcome_settings', 'goodbye_enabled');
    if (!hasGoodbyeEnabled) {
      await db.schema.alterTable('group_welcome_settings', (table) => {
        table.boolean('goodbye_enabled').defaultTo(false);
      });
    }
    const hasGoodbyeMessage = await db.schema.hasColumn('group_welcome_settings', 'goodbye_message');
    if (!hasGoodbyeMessage) {
      await db.schema.alterTable('group_welcome_settings', (table) => {
        table.text('goodbye_message').defaultTo('Au revoir @user, à la prochaine !');
      });
    }
  }
  await loadCacheFromDB();
}

/**
 * Charge le cache depuis la BDD
 */
async function loadCacheFromDB() {
  const settings = await db('group_welcome_settings').select('*');
  groupCache.clear();
  settings.forEach(setting => {
    groupCache.set(setting.group_id, setting);
  });
  // console.log(`📊 Cache groupes chargé: ${groupCache.size} groupes`);
}

/**
 * Obtient les paramètres d'un groupe
 */
export function getGroupSettings(groupId: string): GroupSetting | null {
  return groupCache.get(groupId) || null;
}

/**
 * Met à jour les paramètres d'un groupe
 */
export async function updateGroupSettings(
  groupId: string, 
  groupName: string,
  settings: Partial<Omit<GroupSetting, 'group_id' | 'group_name' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const now = Date.now();
  const currentSettings = getGroupSettings(groupId);

  const newSettings: GroupSetting = {
    group_id: groupId,
    group_name: groupName,
    welcome_enabled: settings.welcome_enabled ?? currentSettings?.welcome_enabled ?? false,
    welcome_message: settings.welcome_message ?? currentSettings?.welcome_message ?? 'Bienvenue @user dans le groupe @group',
    goodbye_enabled: settings.goodbye_enabled ?? currentSettings?.goodbye_enabled ?? false,
    goodbye_message: settings.goodbye_message ?? currentSettings?.goodbye_message ?? 'Au revoir @user, à la prochaine !',
    created_at: currentSettings?.created_at ?? now,
    updated_at: now,
  };

  await db('group_welcome_settings')
    .insert(newSettings)
    .onConflict('group_id')
    .merge({
      group_name: newSettings.group_name,
      welcome_enabled: newSettings.welcome_enabled,
      welcome_message: newSettings.welcome_message,
      goodbye_enabled: newSettings.goodbye_enabled,
      goodbye_message: newSettings.goodbye_message,
      updated_at: newSettings.updated_at
    });

  // Mise à jour du cache
  groupCache.set(groupId, newSettings);
}

/**
 * Supprime les paramètres d'un groupe
 */
export async function deleteGroupSettings(groupId: string): Promise<boolean> {
  const deleted = await db('group_welcome_settings').where({ group_id: groupId }).del();
  if (deleted > 0) {
    groupCache.delete(groupId);
    console.log(`🗑️ Paramètres supprimés pour le groupe: ${groupId}`);
    return true;
  }
  return false;
}

/**
 * Liste tous les groupes configurés
 */
export function getAllGroupSettings(): GroupSetting[] {
  return Array.from(groupCache.values());
}

/**
 * Vérifie si les messages de bienvenue sont activés pour un groupe
 */
export function isWelcomeEnabled(groupId: string): boolean {
  const settings = getGroupSettings(groupId);
  return settings ? settings.welcome_enabled : false;
}

/**
 * Obtient le message de bienvenue d'un groupe
 */
export function getWelcomeMessage(groupId: string): string | null {
  const settings = getGroupSettings(groupId);
  return settings && settings.welcome_enabled ? settings.welcome_message : null;
}

/**
 * Active les messages de bienvenue pour un groupe
 */
export async function enableWelcome(groupId: string, groupName: string, message: string): Promise<void> {
  await updateGroupSettings(groupId, groupName, { welcome_enabled: true, welcome_message: message });
}

/**
 * Désactive les messages de bienvenue pour un groupe
 */
export async function disableWelcome(groupId: string, groupName: string): Promise<void> {
  await updateGroupSettings(groupId, groupName, { welcome_enabled: false });
}

/**
 * Met à jour uniquement le message d'un groupe (sans changer l'état)
 */
export async function updateWelcomeMessage(groupId: string, message: string): Promise<boolean> {
  const current = getGroupSettings(groupId);
  if (!current) return false;
  
  await updateGroupSettings(groupId, current.group_name, { welcome_message: message });
  return true;
}

/**
 * Bascule l'état des messages de bienvenue pour un groupe
 */
export async function toggleWelcome(groupId: string, groupName: string = 'Groupe'): Promise<boolean> {
  const current = getGroupSettings(groupId);
  const newState = current ? !current.welcome_enabled : true;
  
  await updateGroupSettings(groupId, groupName, { welcome_enabled: newState });
  return newState;
}

/**
 * Définit le message de bienvenue pour un groupe
 */
export async function setWelcomeMessage(groupId: string, message: string, groupName: string = 'Groupe'): Promise<void> {
  const current = getGroupSettings(groupId);
  
  await updateGroupSettings(groupId, groupName, { welcome_message: message, welcome_enabled: current?.welcome_enabled ?? false });
}

/**
 * Vérifie si les messages d'au revoir sont activés pour un groupe
 */
export function isGoodbyeEnabled(groupId: string): boolean {
  const settings = getGroupSettings(groupId);
  return settings ? settings.goodbye_enabled : false;
}

/**
 * Obtient le message d'au revoir d'un groupe
 */
export function getGoodbyeMessage(groupId: string): string | null {
  const settings = getGroupSettings(groupId);
  return settings && settings.goodbye_enabled ? settings.goodbye_message : null;
}

/**
 * Active les messages d'au revoir pour un groupe
 */
export async function enableGoodbye(groupId: string, groupName: string, message: string): Promise<void> {
  await updateGroupSettings(groupId, groupName, { goodbye_enabled: true, goodbye_message: message });
}

/**
 * Désactive les messages d'au revoir pour un groupe
 */
export async function disableGoodbye(groupId: string, groupName: string): Promise<void> {
  await updateGroupSettings(groupId, groupName, { goodbye_enabled: false });
}

/**
 * Met à jour uniquement le message d'au revoir d'un groupe
 */
export async function updateGoodbyeMessage(groupId: string, message: string): Promise<boolean> {
  const current = getGroupSettings(groupId);
  if (!current) return false;

  await updateGroupSettings(groupId, current.group_name, { goodbye_message: message });
  return true;
}

/**
 * Bascule l'état des messages d'au revoir pour un groupe
 */
export async function toggleGoodbye(groupId: string, groupName: string = 'Groupe'): Promise<boolean> {
  const current = getGroupSettings(groupId);
  const newState = current ? !current.goodbye_enabled : true;

  await updateGroupSettings(groupId, groupName, { goodbye_enabled: newState });
  return newState;
}

/**
 * Définit le message d'au revoir pour un groupe
 */
export async function setGoodbyeMessage(groupId: string, message: string, groupName: string = 'Groupe'): Promise<void> {
  await updateGroupSettings(groupId, groupName, { goodbye_message: message });
}

/**
 * Récupère tous les groupes avec leurs paramètres
 */
export async function getAllGroupsWithSettings(): Promise<GroupSetting[]> {
  return Array.from(groupCache.values());
}

/**
 * Enregistre ou met à jour un groupe dans la base
 */
export async function registerGroup(groupId: string, groupName: string): Promise<void> {
  const now = Date.now();
  
  try {
    // Utiliser INSERT OR REPLACE pour éviter les conflits
    await db.raw(`
      INSERT OR REPLACE INTO group_welcome_settings 
      (group_id, group_name, welcome_enabled, welcome_message, created_at, updated_at)
      VALUES (?, ?, 
        COALESCE((SELECT welcome_enabled FROM group_welcome_settings WHERE group_id = ?), false),
        COALESCE((SELECT welcome_message FROM group_welcome_settings WHERE group_id = ?), ''),
        COALESCE((SELECT created_at FROM group_welcome_settings WHERE group_id = ?), ?),
        ?)
    `, [groupId, groupName, groupId, groupId, groupId, now, now]);
    
    // console.log(`✅ Groupe enregistré/mis à jour: ${groupName}`);
    
    // Recharger le cache
    await loadCacheFromDB();
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement du groupe:', error);
  }
}

/**
 * Supprime un groupe de la base (quand le bot quitte)
 */
export async function unregisterGroup(groupId: string): Promise<void> {
  try {
    await db('group_welcome_settings')
      .where('group_id', groupId)
      .del();
    
    groupCache.delete(groupId);
    console.log(`➖ Groupe supprimé de la base: ${groupId}`);
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du groupe:', error);
  }
}

// Initialiser au démarrage
initGroupSettingsTable().catch(console.error);