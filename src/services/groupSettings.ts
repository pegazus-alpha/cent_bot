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
      table.text('welcome_message').defaultTo('');
      table.integer('created_at');
      table.integer('updated_at');
    });
    console.log('✅ Table group_welcome_settings créée');
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
  console.log(`📊 Cache groupes chargé: ${groupCache.size} groupes`);
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
  enabled: boolean, 
  message: string = ''
): Promise<void> {
  const now = Date.now();
  const setting: GroupSetting = {
    group_id: groupId,
    group_name: groupName,
    welcome_enabled: enabled,
    welcome_message: message,
    created_at: now,
    updated_at: now
  };

  await db('group_welcome_settings')
    .insert(setting)
    .onConflict('group_id')
    .merge({
      group_name: groupName,
      welcome_enabled: enabled,
      welcome_message: message,
      updated_at: now
    });

  // Mise à jour du cache
  groupCache.set(groupId, setting);
  console.log(`🔄 Groupe mis à jour: ${groupName} (${enabled ? 'activé' : 'désactivé'})`);
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
  await updateGroupSettings(groupId, groupName, true, message);
}

/**
 * Désactive les messages de bienvenue pour un groupe
 */
export async function disableWelcome(groupId: string, groupName: string): Promise<void> {
  await updateGroupSettings(groupId, groupName, false, '');
}

/**
 * Met à jour uniquement le message d'un groupe (sans changer l'état)
 */
export async function updateWelcomeMessage(groupId: string, message: string): Promise<boolean> {
  const current = getGroupSettings(groupId);
  if (!current) return false;
  
  await updateGroupSettings(groupId, current.group_name, current.welcome_enabled, message);
  return true;
}

/**
 * Bascule l'état des messages de bienvenue pour un groupe
 */
export async function toggleWelcome(groupId: string, groupName: string = 'Groupe'): Promise<boolean> {
  const current = getGroupSettings(groupId);
  const newState = current ? !current.welcome_enabled : true;
  const currentMessage = current ? current.welcome_message : 'Bienvenue dans le groupe !';
  
  await updateGroupSettings(groupId, groupName, newState, currentMessage);
  return newState;
}

/**
 * Définit le message de bienvenue pour un groupe
 */
export async function setWelcomeMessage(groupId: string, message: string, groupName: string = 'Groupe'): Promise<void> {
  const current = getGroupSettings(groupId);
  const isEnabled = current ? current.welcome_enabled : false;
  
  await updateGroupSettings(groupId, groupName, isEnabled, message);
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
    // Vérifier si le groupe existe déjà
    const existing = await db('group_welcome_settings')
      .where('group_id', groupId)
      .first();
    
    if (existing) {
      // Mettre à jour le nom si nécessaire
      if (existing.group_name !== groupName) {
        await db('group_welcome_settings')
          .where('group_id', groupId)
          .update({
            group_name: groupName,
            updated_at: now
          });
        console.log(`📝 Groupe mis à jour: ${groupName}`);
      }
    } else {
      // Créer nouveau groupe (inactif par défaut)
      await db('group_welcome_settings').insert({
        group_id: groupId,
        group_name: groupName,
        welcome_enabled: false,
        welcome_message: '',
        created_at: now,
        updated_at: now
      });
      console.log(`➕ Nouveau groupe enregistré: ${groupName}`);
    }
    
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