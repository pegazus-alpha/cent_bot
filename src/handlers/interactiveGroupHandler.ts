/**
 * Gestionnaire de commandes interactives pour la gestion des groupes
 * Interface utilisateur étape par étape
 */

import type { WASocket } from '@whiskeysockets/baileys';
import { sessionManager } from '../services/sessionManager.js';
import { 
  getAllGroupsWithSettings,
  getAllGroupSettings, 
  isWelcomeEnabled, 
  toggleWelcome, 
  setWelcomeMessage, 
  getWelcomeMessage,
  getGroupSettings,
  type GroupSetting
} from '../services/groupSettings.js';

/**
 * Fonction sécurisée pour envoyer des messages
 */
async function safeSendMessage(sock: WASocket, jid: string, content: any): Promise<boolean> {
  try {
    if (!sock || typeof sock.sendMessage !== 'function') {
      console.warn('🚫 Socket non valide pour l\'envoi de message');
      return false;
    }
    
    await sock.sendMessage(jid, content);
    return true;
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'envoi du message:', error?.message || error);
    return false;
  }
}

/**
 * Récupère la liste des groupes avec leurs noms depuis la base de données
 */
async function getGroupsList(sock: WASocket): Promise<Array<{id: string, name: string, enabled: boolean}>> {
  try {
    const groups: GroupSetting[] = await getAllGroupsWithSettings();
    return groups.map((group: GroupSetting) => ({
      id: group.group_id,
      name: group.group_name,
      enabled: group.welcome_enabled
    }));
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des groupes:', error);
    return [];
  }
}

/**
 * Affiche la liste des groupes avec numérotation
 */
async function showGroupsList(sock: WASocket, userId: string): Promise<void> {
  const groups = await getGroupsList(sock);
  
  if (groups.length === 0) {
    await safeSendMessage(sock, userId, {
      text: "❌ Aucun groupe trouvé.\n\nLe bot doit d'abord être ajouté à des groupes pour pouvoir les configurer."
    });
    sessionManager.endSession(userId);
    return;
  }

  let message = "📋 *Choisissez un groupe :*\n\n";
  groups.forEach((group, index) => {
    const status = group.enabled ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ';
    message += `${index + 1}. **${group.name}**\n`;
    message += `   └ Messages : ${status}\n\n`;
  });
  message += `💡 Tapez le numéro du groupe (ex: 1)\n`;
  message += `❌ Ou tapez *annuler* pour quitter`;

  await safeSendMessage(sock, userId, { text: message });
  
  // Sauvegarder la liste des groupes dans la session
  sessionManager.updateSession(userId, { 
    step: 'SELECT_GROUP',
  });
  
  // Stocker la liste des groupes temporairement
  (global as any).userGroupsList = (global as any).userGroupsList || new Map();
  (global as any).userGroupsList.set(userId, groups);
}

/**
 * Affiche les actions possibles pour un groupe
 */
async function showActionsList(sock: WASocket, userId: string, groupId: string, groupName: string): Promise<void> {
  const isEnabled = await isWelcomeEnabled(groupId);
  const currentMessage = await getWelcomeMessage(groupId);
  
  const status = isEnabled ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ';
  const toggleAction = isEnabled ? '🔴 Désactiver' : '🟢 Activer';
  
  let message = `🔧 *Gestion de "${groupName}"*\n\n`;
  message += `📊 Statut actuel : ${status}\n\n`;
  message += `*Actions disponibles :*\n`;
  message += `1. ${toggleAction} les messages\n`;
  message += `2. ✏️ Modifier le message de bienvenue\n`;
  message += `3. 👁️ Voir les paramètres actuels\n\n`;
  message += `💡 Tapez le numéro de votre choix (ex: 2)\n`;
  message += `❌ Ou tapez *annuler* pour quitter`;

  await safeSendMessage(sock, userId, { text: message });
  
  sessionManager.updateSession(userId, {
    step: 'SELECT_ACTION',
    groupId,
    groupName
  });
}

/**
 * Affiche les paramètres actuels d'un groupe
 */
async function showCurrentSettings(sock: WASocket, userId: string, groupId: string, groupName: string): Promise<void> {
  const isEnabled = await isWelcomeEnabled(groupId);
  const message = await getWelcomeMessage(groupId);
  
  const status = isEnabled ? '🟢 ACTIVÉ' : '🔴 DÉSACTIVÉ';
  
  let response = `📊 *Paramètres de "${groupName}"*\n\n`;
  response += `🔧 Statut : ${status}\n\n`;
  
  if (message && message.trim()) {
    response += `📝 Message actuel :\n${message}`;
  } else {
    response += `📝 Message : _(Aucun message configuré)_`;
  }
  
  response += `\n\n💡 Utilisez */welcome* pour modifier ces paramètres`;

  await safeSendMessage(sock, userId, { text: response });
  sessionManager.endSession(userId);
}

/**
 * Demande le nouveau message de bienvenue
 */
async function requestNewMessage(sock: WASocket, userId: string, groupName: string): Promise<void> {
  const message = `✏️ *Nouveau message de bienvenue pour "${groupName}"*\n\n` +
    `📝 Tapez votre message (peut être sur plusieurs lignes)\n\n` +
    `💡 *Instructions :*\n` +
    `• Écrivez votre message normalement\n` +
    `• Vous pouvez faire plusieurs envois\n` +
    `• Tapez */fin* quand c'est terminé\n` +
    `• Tapez */annuler* pour abandonner\n\n` +
    `🚀 Commencez à taper votre message :`;

  await safeSendMessage(sock, userId, { text: message });
  
  sessionManager.updateSession(userId, {
    step: 'ENTER_MESSAGE',
    messageBuffer: []
  });
}

/**
 * Traite les commandes interactives
 */
export async function handleInteractiveCommand(sock: WASocket, from: string, body: string): Promise<boolean> {
  const userId = from;
  
  // Commande pour démarrer le processus
  if (body === '/welcome' || body === '/bienvenue') {
    sessionManager.startSession(userId, 'SELECT_GROUP');
    await showGroupsList(sock, userId);
    return true;
  }

  // Vérifier si l'utilisateur a une session active
  const session = sessionManager.getSession(userId);
  if (!session) {
    return false; // Pas une commande interactive
  }

  // Commande d'annulation
  if (body === '/annuler' || body === '/cancel') {
    sessionManager.endSession(userId);
    await safeSendMessage(sock, userId, { text: "❌ Opération annulée." });
    return true;
  }

  const userGroupsList = (global as any).userGroupsList?.get(userId) || [];

  switch (session.step) {
    case 'SELECT_GROUP':
      const groupIndex = parseInt(body) - 1;
      if (isNaN(groupIndex) || groupIndex < 0 || groupIndex >= userGroupsList.length) {
        await safeSendMessage(sock, userId, { 
          text: "❌ Numéro invalide. Tapez un numéro de la liste ou /annuler" 
        });
        return true;
      }
      
      const selectedGroup = userGroupsList[groupIndex];
      await showActionsList(sock, userId, selectedGroup.id, selectedGroup.name);
      break;

    case 'SELECT_ACTION':
      const actionIndex = parseInt(body);
      if (isNaN(actionIndex) || actionIndex < 1 || actionIndex > 3) {
        await safeSendMessage(sock, userId, { 
          text: "❌ Numéro invalide. Tapez 1, 2, 3 ou /annuler" 
        });
        return true;
      }

      const { groupId, groupName } = session;
      if (!groupId || !groupName) {
        sessionManager.endSession(userId);
        await safeSendMessage(sock, userId, { text: "❌ Erreur de session. Recommencez avec /welcome" });
        return true;
      }

      switch (actionIndex) {
        case 1: // Toggle activation
          const wasEnabled = await isWelcomeEnabled(groupId);
          await toggleWelcome(groupId, groupName);
          const isNowEnabled = await isWelcomeEnabled(groupId);
          
          await safeSendMessage(sock, userId, {
            text: `✅ Messages de bienvenue ${isNowEnabled ? '🟢 activés' : '🔴 désactivés'} pour "${groupName}"`
          });
          sessionManager.endSession(userId);
          break;

        case 2: // Edit message
          await requestNewMessage(sock, userId, groupName);
          break;

        case 3: // View settings
          await showCurrentSettings(sock, userId, groupId, groupName);
          break;
      }
      break;

    case 'ENTER_MESSAGE':
      if (body === '/fin') {
        const completeMessage = sessionManager.getCompleteMessage(userId);
        if (completeMessage.trim()) {
          const { groupId, groupName } = session;
          if (groupId && groupName) {
            await setWelcomeMessage(groupId, completeMessage.trim(), groupName);
            await safeSendMessage(sock, userId, {
              text: `✅ Message de bienvenue enregistré pour "${groupName}"\n\n📝 Message final :\n${completeMessage.trim()}`
            });
          }
        } else {
          await safeSendMessage(sock, userId, { text: "❌ Aucun message saisi. Aucune modification effectuée." });
        }
        sessionManager.endSession(userId);
      } else {
        // Ajouter la ligne au buffer
        sessionManager.addMessageLine(userId, body);
        const currentMessage = sessionManager.getCompleteMessage(userId);
        
        await safeSendMessage(sock, userId, { 
          text: `📝 Message en cours :\n${currentMessage}\n\n💡 Continuez à taper pour ajouter des lignes\n✅ Tapez */fin* quand c'est terminé\n❌ Ou */annuler* pour abandonner`
        });
      }
      break;
  }

  return true;
}

/**
 * Nettoie les données temporaires des groupes
 */
export function cleanupGroupsData(userId: string): void {
  if ((global as any).userGroupsList) {
    (global as any).userGroupsList.delete(userId);
  }
}