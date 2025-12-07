/**
 * Command handler simple
 * - écoute /commande ou !commande
 * - exécute actions admin
 */

import type { WASocket } from '@whiskeysockets/baileys';
import { tagAll, tagAdmins } from '../modules/taggers.js';
import { config } from '../config.js';

export async function handleCommand(sock: WASocket, message: any, text: string) {
  const from = message.key.remoteJid;
  const sender = message.key.participant || message.key.remoteJid;
  const isGroup = from && from.endsWith('@g.us');

  const [cmd, ...rest] = text.trim().split(/\s+/);
  const args = rest.join(' ');

  // commands
  switch ((cmd ?? '').toLowerCase()) {
    case '/tag':
    case '!tag':
      if (!isGroup) return;
      if (args === 'all') await tagAll(sock, from, '🔔 @everyone');
      else if (args === 'admins') await tagAdmins(sock, from, '🔔 @admins');
      break;

    case '/setblock':
      // ex: /setblock images on, /setblock whatsapplinks off
      {
        const [what, value] = args.split(/\s+/);
        if (!what || !value) {
          await sock.sendMessage(from, { text: `Usage: /setblock [type] [on/off]` }, { quoted: message });
          return;
        }
        const on = value === 'on' || value === '1' || value === 'true';
        let keyToUpdate: keyof typeof config.moderation | null = null;

        switch (what.toLowerCase()) {
          case 'images': keyToUpdate = 'blockImages'; break;
          case 'videos': keyToUpdate = 'blockVideos'; break;
          case 'audio': keyToUpdate = 'blockAudio'; break;
          case 'docs': keyToUpdate = 'blockDocs'; break;
          case 'links': keyToUpdate = 'blockLinks'; break;
          case 'whatsapplinks': keyToUpdate = 'blockWhatsappLinks'; break;
          case 'mentions': keyToUpdate = 'blockMentions'; break;
        }

        if (keyToUpdate) {
          (config.moderation as any)[keyToUpdate] = on;
          await sock.sendMessage(from, { text: `🔧 Config mise à jour: ${what} = ${on ? '✅ ACTIVÉ' : '❌ DÉSACTIVÉ'}` }, { quoted: message });
        } else {
          await sock.sendMessage(from, { text: `Type de blocage non reconnu: ${what}` }, { quoted: message });
        }
      }
      break;

    case '/addword':
      {
        const groupMetadata = await sock.groupMetadata(from);
        const senderIsAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin === 'admin' || groupMetadata.participants.find(p => p.id === sender)?.admin === 'superadmin';

        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: 'Seuls les admins peuvent utiliser cette commande.' }, { quoted: message });
          return;
        }

        if (!args) {
          await sock.sendMessage(from, { text: 'Usage: /addword [mot]' }, { quoted: message });
          return;
        }
        const word = args.toLowerCase();
        if (!config.moderation.bannedWords.includes(word)) {
          config.moderation.bannedWords.push(word);
          await sock.sendMessage(from, { text: `✅ Mot "${word}" ajouté à la liste des mots interdits.` }, { quoted: message });
        } else {
          await sock.sendMessage(from, { text: `⚠️ Mot "${word}" est déjà dans la liste.` }, { quoted: message });
        }
      }
      break;

    case '/delword':
      {
        const groupMetadata = await sock.groupMetadata(from);
        const senderIsAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin === 'admin' || groupMetadata.participants.find(p => p.id === sender)?.admin === 'superadmin';

        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: 'Seuls les admins peuvent utiliser cette commande.' }, { quoted: message });
          return;
        }
        
        if (!args) {
          await sock.sendMessage(from, { text: 'Usage: /delword [mot]' }, { quoted: message });
          return;
        }
        const word = args.toLowerCase();
        const index = config.moderation.bannedWords.indexOf(word);
        if (index > -1) {
          config.moderation.bannedWords.splice(index, 1);
          await sock.sendMessage(from, { text: `✅ Mot "${word}" supprimé de la liste des mots interdits.` }, { quoted: message });
        } else {
          await sock.sendMessage(from, { text: `⚠️ Mot "${word}" n'est pas dans la liste.` }, { quoted: message });
        }
      }
      break;

    case '/modstatus':
      // Afficher l'état actuel de la modération
      {
        const status = `📋 **État de la modération:**
        
🖼️ Images: ${config.moderation.blockImages ? '✅ Bloquées' : '❌ Autorisées'}
🎥 Vidéos: ${config.moderation.blockVideos ? '✅ Bloquées' : '❌ Autorisées'}
🎵 Audio: ${config.moderation.blockAudio ? '✅ Bloqués' : '❌ Autorisés'}
📄 Documents: ${config.moderation.blockDocs ? '✅ Bloqués' : '❌ Autorisés'}
🔗 Liens (généraux): ${config.moderation.blockLinks ? '✅ Bloqués' : '❌ Autorisés'}
💬 Liens WhatsApp: ${config.moderation.blockWhatsappLinks ? '✅ Bloqués' : '❌ Autorisés'}
👥 Mentions: ${config.moderation.blockMentions ? '✅ Bloquées' : '❌ Autorisées'}
🤬 Mots interdits: ${config.moderation.bannedWords.join(', ') || 'Aucun'}
        
⚡ Anti-Flood: ${config.moderation.antiFlood.enabled ? `✅ Activé (${config.moderation.antiFlood.messageLimit} msgs / ${config.moderation.antiFlood.timeFrame}s)` : '❌ Désactivé'}`;
        
        await sock.sendMessage(from, { text: status }, { quoted: message });
      }
      break;

    case '/kick':
    case '!kick':
      if (!isGroup) {
        await sock.sendMessage(from, { text: 'Cette commande ne peut être utilisée que dans un groupe.' }, { quoted: message });
        return;
      }
      try {
        const groupMetadata = await sock.groupMetadata(from);
        const senderIsAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin === 'admin' || groupMetadata.participants.find(p => p.id === sender)?.admin === 'superadmin';

        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: 'Seuls les admins peuvent utiliser cette commande.' }, { quoted: message });
          return;
        }

        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJids.length === 0) {
          await sock.sendMessage(from, { text: 'Veuillez mentionner les utilisateurs à expulser. Usage: /kick @user1 @user2' }, { quoted: message });
          return;
        }

        const kickPromises = mentionedJids.map(jid => sock.groupParticipantsUpdate(from, [jid], 'remove'));
        await Promise.all(kickPromises);

        await sock.sendMessage(from, { text: `✅ ${mentionedJids.length} utilisateur(s) ont été expulsé(s).` }, { quoted: message });
      } catch (error) {
        console.error('Erreur lors de l\'expulsion:', error);
        await sock.sendMessage(from, { text: 'Une erreur est survenue lors de l\'expulsion.' }, { quoted: message });
      }
      break;

    case '/promote':
    case '!promote':
      if (!isGroup) {
        await sock.sendMessage(from, { text: 'Cette commande ne peut être utilisée que dans un groupe.' }, { quoted: message });
        return;
      }
      try {
        const groupMetadata = await sock.groupMetadata(from);
        const senderIsAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin === 'admin' || groupMetadata.participants.find(p => p.id === sender)?.admin === 'superadmin';

        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: 'Seuls les admins peuvent utiliser cette commande.' }, { quoted: message });
          return;
        }

        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJids.length === 0) {
          await sock.sendMessage(from, { text: 'Veuillez mentionner les utilisateurs à promouvoir. Usage: /promote @user1 @user2' }, { quoted: message });
          return;
        }

        const promotePromises = mentionedJids.map(jid => sock.groupParticipantsUpdate(from, [jid], 'promote'));
        await Promise.all(promotePromises);

        await sock.sendMessage(from, { text: `✅ ${mentionedJids.length} utilisateur(s) ont été promu(s) admin.` }, { quoted: message });
      } catch (error) {
        console.error('Erreur lors de la promotion:', error);
        await sock.sendMessage(from, { text: 'Une erreur est survenue lors de la promotion.' }, { quoted: message });
      }
      break;

    case '/demote':
    case '!demote':
      if (!isGroup) {
        await sock.sendMessage(from, { text: 'Cette commande ne peut être utilisée que dans un groupe.' }, { quoted: message });
        return;
      }
      try {
        const groupMetadata = await sock.groupMetadata(from);
        const senderIsAdmin = groupMetadata.participants.find(p => p.id === sender)?.admin === 'admin' || groupMetadata.participants.find(p => p.id === sender)?.admin === 'superadmin';

        if (!senderIsAdmin) {
          await sock.sendMessage(from, { text: 'Seuls les admins peuvent utiliser cette commande.' }, { quoted: message });
          return;
        }

        const mentionedJids = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (mentionedJids.length === 0) {
          await sock.sendMessage(from, { text: 'Veuillez mentionner les utilisateurs à démettre. Usage: /demote @user1 @user2' }, { quoted: message });
          return;
        }

        const demotePromises = mentionedJids.map(jid => sock.groupParticipantsUpdate(from, [jid], 'demote'));
        await Promise.all(demotePromises);

        await sock.sendMessage(from, { text: `✅ ${mentionedJids.length} utilisateur(s) ont été démis de leurs fonctions d'admin.` }, { quoted: message });
      } catch (error) {
        console.error('Erreur lors de la démotion:', error);
        await sock.sendMessage(from, { text: 'Une erreur est survenue lors de la démotion.' }, { quoted: message });
      }
      break;

    case '/help':
      await sock.sendMessage(from, { 
        text: `🤖 **Commandes disponibles:**

👥 **Mentions:**
• /tag all - Mentionner tous les membres
• /tag admins - Mentionner les admins

🛡️ **Modération (Admins seulement):**
• /kick @user - Expulser un ou plusieurs membres
• /promote @user - Promouvoir un membre admin
• /demote @user - Démmettre un admin
• /setblock [type] [on/off] - Bloquer/débloquer
  - Types: images, videos, audio, docs, links, mentions
• /modstatus - Voir l'état de la modération

ℹ️ **Aide:**
• /help - Afficher cette aide

**Exemples:**
/kick @membre1
/promote @membre2
/demote @admin
/setblock links on` 
      }, { quoted: message });
      break;

    default:
      // non reconnu
      break;
  }
}
