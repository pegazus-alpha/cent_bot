/**
 * Modération des messages de groupe
 * - Anti-flood
 * - Anti-lien (invitations WhatsApp)
 * - Filtre de mots interdits
 */

import type { WASocket, proto } from '@whiskeysockets/baileys';
import { config } from '../config.js';
import { logModeration } from '../services/db.js';

// In-memory store for anti-flood
const userMessageTimestamps: { [groupId: string]: { [userId: string]: number[] } } = {};

async function handleAntiFlood(sock: WASocket, msg: proto.IWebMessageInfo, isSenderAdmin: boolean): Promise<boolean> {
  if (!config.moderation.antiFlood.enabled) return false;

  const key = msg.key;
  const remoteJid = key.remoteJid!;
  const senderJid = key.participant || key.remoteJid!;

  const now = Date.now();
  if (!userMessageTimestamps[remoteJid]) userMessageTimestamps[remoteJid] = {};
  if (!userMessageTimestamps[remoteJid][senderJid]) userMessageTimestamps[remoteJid][senderJid] = [];
  
  const userTimestamps = userMessageTimestamps[remoteJid][senderJid];
  userTimestamps.push(now);
  
  const timeFrame = config.moderation.antiFlood.timeFrame * 1000;
  const recentTimestamps = userTimestamps.filter(ts => now - ts < timeFrame);
  userMessageTimestamps[remoteJid][senderJid] = recentTimestamps;

  if (recentTimestamps.length > config.moderation.antiFlood.messageLimit) {
    console.log(`🌊 Flood détecté de ${senderJid} dans ${remoteJid}`);
    logModeration(senderJid, 'flood_detected', `msgs: ${recentTimestamps.length}/${config.moderation.antiFlood.timeFrame}s`);

    if (config.moderation.antiFlood.action === 'warn') {
      await sock.sendMessage(senderJid, { text: `🚨 Anti-Flood 🚨\nVous envoyez des messages trop rapidement. Veuillez ralentir.` });
    } else if (config.moderation.antiFlood.action === 'kick' && !isSenderAdmin) {
      try {
        await sock.sendMessage(remoteJid, { text: `👢 Anti-Flood: ${senderJid.split('@')[0]} a été expulsé pour spam.` });
        await sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
        logModeration(senderJid, 'kick', 'flood');
      } catch (e) {
        console.warn('Impossible d\'expulser pour flood (pas admin?):', (e as any)?.message || e);
      }
    }
    // Reset timestamps after action
    userMessageTimestamps[remoteJid][senderJid] = [];
    return true; // Flood detected and action taken
  }
  return false; // No flood
}

async function handleContentModeration(sock: WASocket, msg: proto.IWebMessageInfo, isSenderAdmin: boolean): Promise<boolean> {
  if (isSenderAdmin) return false;

  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  let reason = '';
  let shouldDelete = false;

  // 1. Banned words check
  if (config.moderation.bannedWords.length > 0) {
    const lowerCaseText = text.toLowerCase();
    for (const word of config.moderation.bannedWords) {
      if (lowerCaseText.includes(word.toLowerCase())) {
        shouldDelete = true;
        reason = `mot interdit: ${word}`;
        break;
      }
    }
  }

  // 2. Anti-link check (WhatsApp links)
  if (!shouldDelete && config.moderation.blockWhatsappLinks && /chat\.whatsapp\.com\/[A-Za-z0-9]{22}/i.test(text)) {
    shouldDelete = true;
    reason = 'lien de groupe interdit';
  }
  
  if (shouldDelete) {
    try {
      await sock.sendMessage(msg.key.remoteJid!, { delete: msg.key });
      logModeration(msg.key.participant || msg.key.remoteJid!, 'delete_message', reason);
      console.log(`🗑️ Message de ${msg.key.participant || msg.key.remoteJid!} supprimé. Raison: ${reason}`);
      return true;
    } catch (e) {
      console.warn('Impossible de supprimer le message (pas admin?):', (e as any)?.message || e);
      return false;
    }
  }

  return false;
}


export async function moderateMessage(sock: WASocket, msg: proto.IWebMessageInfo) {
  try {
    const remoteJid = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;

    if (!remoteJid || !remoteJid.endsWith('@g.us') || !senderJid) return;

    const groupMetadata = await sock.groupMetadata(remoteJid);
    const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
    const isSenderAdmin = admins.includes(senderJid);

    // Anti-Flood check first
    const floodDetected = await handleAntiFlood(sock, msg, isSenderAdmin);
    if (floodDetected) return; // Stop processing if flood is handled

    // Content moderation (links, words)
    await handleContentModeration(sock, msg, isSenderAdmin);

  } catch (e) {
    console.error('moderateMessage error', e);
  }
}