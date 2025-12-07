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
import type { WASocket } from '@whiskeysockets/baileys';
import { saveMessage } from '../services/db.js';

export async function handleViewOnce(sock: WASocket, message: proto.IWebMessageInfo) {
  try {
    const msg = message.message;
    if (!msg) return null;

    // viewOnce possible shapes: imageMessage with viewOnce flag OR videoMessage viewOnce etc.
    const inner: { content: any; type: 'image' | 'video' | 'audio' } | null =
      (msg?.imageMessage && msg.imageMessage.viewOnce ? { content: msg.imageMessage, type: 'image' } : null)
      || (msg?.videoMessage && (msg.videoMessage as any).viewOnce ? { content: msg.videoMessage as any, type: 'video' } : null)
      || (msg?.audioMessage && (msg.audioMessage as any).ptt && (msg.audioMessage as any).viewOnce ? { content: msg.audioMessage as any, type: 'audio' } : null);

    if (!inner) return null;

    const stream = await downloadContentFromMessage(message.message as any, inner.type);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const ext = guessExt((inner.content as any).mimetype);
    const path = saveMedia(buffer, ext);

    // Save to DB (id = message.key.id)
    saveMessage(message.key.id || `${Date.now()}`, message.key.participant || message.key.remoteJid || 'unknown', message.key.remoteJid || null, `[viewonce ${inner.type}]`, path);

    // Renvoyer le média dans le même chat pour le rendre visible
    const remoteJid = message.key.remoteJid;
    if (remoteJid) {
      const senderName = message.pushName || message.key.participant?.split('@')[0] || 'Quelqu\'un';
      await sock.sendMessage(
        remoteJid,
        { 
          [inner.type]: buffer, 
          caption: `👀 Média "vue unique" envoyé par ${senderName}`
        } as any,
        { quoted: message }
      );
    }

    return path;
  } catch (e) {
    console.error('handleViewOnce error', e);
    return null;
  }
}
