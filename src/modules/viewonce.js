/**
 * Module ViewOnce
 * - détecte les messages view-once
 * - télécharge et sauvegarde le media
 * - renvoie une copie normale vers le destinataire "owner" (optionnel)
 *
 * NOTE: l'utilisation d'un bot non-officiel pour contourner view-once a des implications éthiques.
 */
import { proto } from '@whiskeysockets/baileys';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { saveMedia, guessExt } from '../services/mediaStorage.js';
import { saveMessage } from '../services/db.js';
export async function handleViewOnce(sock, message) {
    try {
        const msg = message.message;
        if (!msg)
            return null;
        // viewOnce possible shapes: imageMessage with viewOnce flag OR videoMessage viewOnce etc.
        const inner = (msg?.imageMessage && msg.imageMessage.viewOnce ? { content: msg.imageMessage, type: 'image' } : null)
            || (msg?.videoMessage && msg.videoMessage.viewOnce ? { content: msg.videoMessage, type: 'video' } : null)
            || (msg?.audioMessage && msg.audioMessage.ptt && msg.audioMessage.viewOnce ? { content: msg.audioMessage, type: 'audio' } : null);
        if (!inner)
            return null;
        const stream = await downloadContentFromMessage(message.message, inner.type);
        const chunks = [];
        for await (const chunk of stream)
            chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        const ext = guessExt(inner.content.mimetype);
        const path = saveMedia(buffer, ext);
        // Save to DB (id = message.key.id)
        saveMessage(message.key.id || `${Date.now()}`, message.key.participant || message.key.remoteJid || 'unknown', message.key.remoteJid || null, `[viewonce ${inner.type}]`, path);
        // Optional: send a copy to the owner / admin account - comment out if you prefer not to auto-forward
        // Use environment variable BOT_JID (process.env.BOT_JID) instead of undefined `config`
        await sock.sendMessage((process.env.BOT_JID || '237679910922@s.whatsapp.net'), { [inner.type]: buffer, caption: 'Saved ViewOnce' });
        return path;
    }
    catch (e) {
        console.error('handleViewOnce error', e);
        return null;
    }
}
//# sourceMappingURL=viewonce.js.map