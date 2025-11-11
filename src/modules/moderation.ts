/**
 * Modération simple
 * - block types: images/videos/audio/docs
 * - suppression et kick si nécessaire
 */

import type { WASocket } from '@whiskeysockets/baileys';
import { saveMessage, logModeration } from '../services/db.js';

export const MOD_CONFIG = {
  blockImages: false,
  blockVideos: false,
  blockAudio: false,
  blockDocs: false,
  blockLinks: false,
  blockMentions: false,
  autoKickOnBan: false
};

export async function moderateMessage(sock: WASocket, msg: any) {
  try {
    const key = msg.key;
    const remote = key.remoteJid;
    // ignore one-to-one for group moderation
    if (!remote || !remote.endsWith('@g.us')) return;

    // Vérification des médias
    const isImage = !!msg.message?.imageMessage;
    const isVideo = !!msg.message?.videoMessage;
    const isAudio = !!msg.message?.audioMessage;
    const isDoc = !!msg.message?.documentMessage;

    // Vérification du texte pour liens et mentions
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const hasLinks = /https?:\/\/[^\s]+/i.test(text);
    const hasMentions = !!msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length;

    const shouldDelete = 
      (isImage && MOD_CONFIG.blockImages) ||
      (isVideo && MOD_CONFIG.blockVideos) ||
      (isAudio && MOD_CONFIG.blockAudio) ||
      (isDoc && MOD_CONFIG.blockDocs) ||
      (hasLinks && MOD_CONFIG.blockLinks) ||
      (hasMentions && MOD_CONFIG.blockMentions);

    if (shouldDelete) {
      // delete message (the bot must be admin)
      try {
        await sock.sendMessage(remote, { delete: msg.key });
        
        const jid = key.participant || key.remoteJid || 'unknown';
        let reason = 'blocked: ';
        if (isImage && MOD_CONFIG.blockImages) reason += 'image ';
        if (isVideo && MOD_CONFIG.blockVideos) reason += 'video ';
        if (isAudio && MOD_CONFIG.blockAudio) reason += 'audio ';
        if (isDoc && MOD_CONFIG.blockDocs) reason += 'document ';
        if (hasLinks && MOD_CONFIG.blockLinks) reason += 'link ';
        if (hasMentions && MOD_CONFIG.blockMentions) reason += 'mention ';
        
        logModeration(jid, 'delete_message', reason.trim());
        console.log(`🗑️ Message supprimé de ${jid}: ${reason}`);
        
      } catch (e) {
        console.warn('Could not delete message (not admin?)', (e as any)?.message || e);
      }
    }

    // Save message to DB for history
    await saveMessage(key.id || `${Date.now()}`, key.participant || key.remoteJid || 'unknown', remote, JSON.stringify(msg.message) || '', null);
  } catch (e) {
    console.error('moderateMessage error', e);
  }
}
