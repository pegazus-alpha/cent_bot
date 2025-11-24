/**
 * Gestionnaire de commandes de gestion des groupes
 * Commandes envoyées en privé au bot pour gérer les paramètres
 */

import type { WASocket } from '@whiskeysockets/baileys';
import { 
  getAllGroupSettings, 
  enableWelcome, 
  disableWelcome, 
  updateWelcomeMessage,
  getGroupSettings,
  deleteGroupSettings 
} from '../services/groupSettings.js';

/**
 * Gestionnaire des commandes de gestion des groupes
 * Utilisé uniquement en conversation privée avec le bot
 */
export async function handleGroupManagementCommands(sock: WASocket, message: any, text: string) {
  const from = message.key.remoteJid;
  const sender = message.key.participant || message.key.remoteJid;
  
  // Vérifier que c'est un message privé (pas dans un groupe)
  const isPrivate = from && !from.endsWith('@g.us');
  if (!isPrivate) return false;

  // TODO: Ajouter ici la vérification que l'utilisateur est autorisé (admin)
  // if (sender !== 'YOUR_ADMIN_JID@s.whatsapp.net') return false; 

  const [cmd, ...args] = text.trim().split(/\s+/);
  
  switch ((cmd ?? '').toLowerCase()) {
    case '/grouplist':
      await handleGroupList(sock, from);
      return true;

    case '/groupset':
      await handleGroupSet(sock, from, args);
      return true;

    case '/groupedit':
      await handleGroupEdit(sock, from, args);
      return true;

    case '/groupshow':
      await handleGroupShow(sock, from, args);
      return true;

    case '/groupdel':
      await handleGroupDelete(sock, from, args);
      return true;

    case '/grouphelp':
      await handleGroupHelp(sock, from);
      return true;

    default:
      return false;
  }
}

/**
 * Liste tous les groupes configurés
 */
async function handleGroupList(sock: WASocket, from: string) {
  const groups = getAllGroupSettings();
  
  if (groups.length === 0) {
    await sock.sendMessage(from, { 
      text: '📭 Aucun groupe configuré pour les messages de bienvenue.' 
    });
    return;
  }

  let response = '📊 **Groupes configurés :**\n\n';
  
  for (const group of groups) {
    const status = group.welcome_enabled ? '✅ Activé' : '❌ Désactivé';
    const messagePreview = group.welcome_message ? 
      group.welcome_message.substring(0, 50) + '...' : 
      'Aucun message';
    
    response += `**${group.group_name}**\n`;
    response += `ID: \`${group.group_id}\`\n`;
    response += `État: ${status}\n`;
    response += `Message: ${messagePreview}\n\n`;
  }
  
  response += '\n💡 Utilisez `/groupshow [ID]` pour voir les détails';
  
  await sock.sendMessage(from, { text: response });
}

/**
 * Configure un groupe (activer/désactiver avec message)
 */
async function handleGroupSet(sock: WASocket, from: string, args: string[]) {
  if (args.length < 3) {
    await sock.sendMessage(from, { 
      text: '❌ Usage: `/groupset [GROUP_ID] [enable/disable] "Message"`\n\nExemple:\n`/groupset 123456@g.us enable "Bienvenue dans notre groupe !"`' 
    });
    return;
  }

  const groupId = args[0];
  const action = args[1]?.toLowerCase();
  const message = args.slice(2).join(' ').replace(/["""]/g, ''); // Nettoyer les guillemets

  // Vérifications de sécurité
  if (!groupId || !action) {
    await sock.sendMessage(from, { text: '❌ ID de groupe ou action manquant.' });
    return;
  }

  if (!groupId.endsWith('@g.us')) {
    await sock.sendMessage(from, { text: '❌ ID de groupe invalide. Il doit se terminer par @g.us' });
    return;
  }

  try {
    // Obtenir les infos du groupe
    const groupMetadata = await sock.groupMetadata(groupId).catch(() => null);
    const groupName = groupMetadata?.subject || 'Groupe inconnu';

    if (action === 'enable') {
      if (!message) {
        await sock.sendMessage(from, { text: '❌ Veuillez spécifier un message de bienvenue.' });
        return;
      }
      
      await enableWelcome(groupId, groupName, message);
      await sock.sendMessage(from, { 
        text: `✅ Messages de bienvenue **activés** pour "${groupName}"\n\n📝 Message défini:\n${message}` 
      });
      
    } else if (action === 'disable') {
      await disableWelcome(groupId, groupName);
      await sock.sendMessage(from, { 
        text: `❌ Messages de bienvenue **désactivés** pour "${groupName}"` 
      });
      
    } else {
      await sock.sendMessage(from, { text: '❌ Action invalide. Utilisez "enable" ou "disable".' });
    }
    
  } catch (error) {
    console.error('Erreur groupset:', error);
    await sock.sendMessage(from, { text: '❌ Erreur lors de la configuration du groupe.' });
  }
}

/**
 * Modifie uniquement le message d'un groupe
 */
async function handleGroupEdit(sock: WASocket, from: string, args: string[]) {
  if (args.length < 2) {
    await sock.sendMessage(from, { 
      text: '❌ Usage: `/groupedit [GROUP_ID] "Nouveau message"`\n\nExemple:\n`/groupedit 123456@g.us "Nouveau message de bienvenue"`' 
    });
    return;
  }

  const groupId = args[0];
  const newMessage = args.slice(1).join(' ').replace(/["""]/g, '');

  // Vérification de sécurité
  if (!groupId) {
    await sock.sendMessage(from, { text: '❌ ID de groupe manquant.' });
    return;
  }

  const success = await updateWelcomeMessage(groupId, newMessage);
  
  if (success) {
    await sock.sendMessage(from, { 
      text: `✅ Message mis à jour pour le groupe\n\n📝 Nouveau message:\n${newMessage}` 
    });
  } else {
    await sock.sendMessage(from, { 
      text: '❌ Groupe non trouvé. Utilisez `/grouplist` pour voir les groupes configurés.' 
    });
  }
}

/**
 * Affiche les détails d'un groupe
 */
async function handleGroupShow(sock: WASocket, from: string, args: string[]) {
  if (args.length < 1) {
    await sock.sendMessage(from, { text: '❌ Usage: `/groupshow [GROUP_ID]`' });
    return;
  }

  const groupId = args[0];
  
  // Vérification de sécurité
  if (!groupId) {
    await sock.sendMessage(from, { text: '❌ ID de groupe manquant.' });
    return;
  }

  const settings = getGroupSettings(groupId);
  
  if (!settings) {
    await sock.sendMessage(from, { text: '❌ Groupe non configuré.' });
    return;
  }

  const status = settings.welcome_enabled ? '✅ Activé' : '❌ Désactivé';
  const createdDate = new Date(settings.created_at).toLocaleString();
  const updatedDate = new Date(settings.updated_at).toLocaleString();

  const response = `📋 **Détails du groupe**

**Nom:** ${settings.group_name}
**ID:** \`${settings.group_id}\`
**État:** ${status}
**Créé:** ${createdDate}
**Modifié:** ${updatedDate}

**📝 Message de bienvenue:**
${settings.welcome_message || 'Aucun message défini'}`;

  await sock.sendMessage(from, { text: response });
}

/**
 * Supprime la configuration d'un groupe
 */
async function handleGroupDelete(sock: WASocket, from: string, args: string[]) {
  if (args.length < 1) {
    await sock.sendMessage(from, { text: '❌ Usage: `/groupdel [GROUP_ID]`' });
    return;
  }

  const groupId = args[0];
  
  // Vérification de sécurité
  if (!groupId) {
    await sock.sendMessage(from, { text: '❌ ID de groupe manquant.' });
    return;
  }

  const success = await deleteGroupSettings(groupId);
  
  if (success) {
    await sock.sendMessage(from, { text: `🗑️ Configuration supprimée pour le groupe ${groupId}` });
  } else {
    await sock.sendMessage(from, { text: '❌ Groupe non trouvé.' });
  }
}

/**
 * Affiche l'aide des commandes de gestion
 */
async function handleGroupHelp(sock: WASocket, from: string) {
  const help = `🤖 **Gestion des messages de bienvenue**

✨ **Nouvelle interface interactive (RECOMMANDÉE):**
• \`/welcome\` - Interface facile étape par étape
  └ Choix du groupe par numéro
  └ Actions simplifiées 
  └ Messages multi-lignes supportés

📊 **Commandes rapides (anciennes):**
• \`/grouplist\` - Liste tous les groupes configurés
• \`/groupshow [ID]\` - Détails d'un groupe

⚙️ **Configuration avancée:**
• \`/groupset [ID] enable "Message"\` - Activer avec message
• \`/groupset [ID] disable\` - Désactiver
• \`/groupedit [ID] "Nouveau message"\` - Modifier le message
• \`/groupdel [ID]\` - Supprimer la configuration

ℹ️ **Aide:**
• \`/grouphelp\` - Cette aide

**🌟 Exemple avec la nouvelle interface:**
1. Tapez: \`/welcome\`
2. Choisissez: \`2\` (pour le 2ème groupe de la liste)
3. Choisissez: \`2\` (pour modifier le message)
4. Tapez votre message (même sur plusieurs lignes)
5. Tapez: \`/fin\` pour terminer

**📝 Exemples anciennes commandes:**
\`/groupset 123456@g.us enable "Bienvenue !"\`
\`/groupedit 123456@g.us "Nouveau message"\`
\`/groupshow 123456@g.us\`

**💡 Notes importantes:**
• Ces commandes ne fonctionnent qu'en **message privé**
• Les messages de bienvenue sont **désactivés par défaut**
• Utilisez \`/welcome\` pour une expérience plus simple !`;

  await sock.sendMessage(from, { text: help });
}