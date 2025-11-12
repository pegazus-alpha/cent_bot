/**
 * Command handler simple
 * - écoute /commande ou !commande
 * - exécute actions admin
 */
import { tagAll, tagAdmins } from '../modules/taggers.js';
import { MOD_CONFIG } from '../modules/moderation.js';
export async function handleCommand(sock, message, text) {
    const from = message.key.remoteJid;
    const sender = message.key.participant || message.key.remoteJid;
    const isGroup = from && from.endsWith('@g.us');
    const [cmd, ...rest] = text.trim().split(/\s+/);
    const args = rest.join(' ');
    // commands
    switch ((cmd ?? '').toLowerCase()) {
        case '/tag':
        case '!tag':
            if (!isGroup)
                return;
            if (args === 'all')
                await tagAll(sock, from, '🔔 @everyone');
            else if (args === 'admins')
                await tagAdmins(sock, from, '🔔 @admins');
            break;
        case '/setblock':
            // ex: /setblock images on, /setblock links off, /setblock mentions on
            {
                const [what, value] = args.split(/\s+/);
                const on = value === 'on' || value === '1' || value === 'true';
                if (what === 'images')
                    MOD_CONFIG.blockImages = on;
                if (what === 'videos')
                    MOD_CONFIG.blockVideos = on;
                if (what === 'audio')
                    MOD_CONFIG.blockAudio = on;
                if (what === 'docs')
                    MOD_CONFIG.blockDocs = on;
                if (what === 'links')
                    MOD_CONFIG.blockLinks = on;
                if (what === 'mentions')
                    MOD_CONFIG.blockMentions = on;
                await sock.sendMessage(from, { text: `🔧 Config mise à jour: ${what} = ${on ? '✅ ACTIVÉ' : '❌ DÉSACTIVÉ'}` }, { quoted: message });
            }
            break;
        case '/modstatus':
            // Afficher l'état actuel de la modération
            {
                const status = `📋 **État de la modération:**
        
🖼️ Images: ${MOD_CONFIG.blockImages ? '✅ Bloquées' : '❌ Autorisées'}
🎥 Vidéos: ${MOD_CONFIG.blockVideos ? '✅ Bloquées' : '❌ Autorisées'}
🎵 Audio: ${MOD_CONFIG.blockAudio ? '✅ Bloqués' : '❌ Autorisés'}
📄 Documents: ${MOD_CONFIG.blockDocs ? '✅ Bloqués' : '❌ Autorisés'}
🔗 Liens: ${MOD_CONFIG.blockLinks ? '✅ Bloqués' : '❌ Autorisés'}
👥 Mentions: ${MOD_CONFIG.blockMentions ? '✅ Bloquées' : '❌ Autorisées'}`;
                await sock.sendMessage(from, { text: status }, { quoted: message });
            }
            break;
        case '/help':
            await sock.sendMessage(from, {
                text: `🤖 **Commandes disponibles:**

👥 **Mentions:**
• /tag all - Mentionner tous les membres
• /tag admins - Mentionner les admins

🛡️ **Modération:**
• /setblock [type] [on/off] - Bloquer/débloquer
  - Types: images, videos, audio, docs, links, mentions
• /modstatus - Voir l'état de la modération

ℹ️ **Aide:**
• /help - Afficher cette aide

**Exemples:**
/setblock links on
/setblock mentions off
/modstatus`
            }, { quoted: message });
            break;
        default:
            // non reconnu
            break;
    }
}
//# sourceMappingURL=commandHandler.js.map