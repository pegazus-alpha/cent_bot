/**
 * Group events: welcome / goodbye / update metadata
 * Version sécurisée avec gestion des déconnexions
 */

import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import { createOrUpdateUser } from '../services/db.js';
import { isWelcomeEnabled, getWelcomeMessage, isGoodbyeEnabled, getGoodbyeMessage } from '../services/groupSettings.js';
import { getUsername } from '../utils/helpers.js';

/**
 * Fonction sécurisée pour envoyer des messages
 */
async function safeSendMessage(sock: WASocket, jid: string, content: any): Promise<boolean> {
  try {
    if (!sock || typeof sock.sendMessage !== 'function') {
      console.warn('🚫 Socket non valide pour l\'envoi de message');
      return false;
    }
    
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Message timeout')), 15000)
    );
    
    await Promise.race([sock.sendMessage(jid, content), timeout]);
    return true;
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'envoi du message:', error?.message || error);
    if (error?.message?.includes('timeout') || 
        error?.message?.includes('Timed Out') ||
        error?.output?.statusCode === 428 || 
        error?.message?.includes('Connection Closed')) {
      console.warn('⚠️ Timeout ou connexion fermée, message non envoyé');
    }
    return false;
  }
}

async function handleParticipantAdd(sock: WASocket, groupUpdate: any) {
  const groupId = groupUpdate.id;
  if (!isWelcomeEnabled(groupId)) {
    console.log(`⏸️ Messages de bienvenue désactivés pour le groupe ${groupId}`);
    return;
  }

  const welcomeMessageTemplate = getWelcomeMessage(groupId);
  if (!welcomeMessageTemplate) return;

  for (const participant of groupUpdate.participants) {
    try {
      await createOrUpdateUser(participant, 'unknown');
      
      const username = await getUsername(sock, participant);
      const groupMetadata = await sock.groupMetadata(groupId);
      const groupName = groupMetadata.subject;
      
      const welcomeMessage = welcomeMessageTemplate
        .replace(/@user/g, `@${username}`)
        .replace(/@group/g, groupName);

      const success = await safeSendMessage(sock, groupId, { 
        text: welcomeMessage,
        mentions: [participant]
      });
      
      if (success) {
        console.log(`📨 Message de bienvenue envoyé à ${username} dans le groupe ${groupName}`);
      } else {
        console.warn(`⚠️ Échec de l'envoi du message de bienvenue à ${username}`);
      }
    } catch (dbError) {
      console.error('❌ Erreur lors de la sauvegarde/traitement du nouvel utilisateur:', dbError);
    }
  }
}

async function handleParticipantRemove(sock: WASocket, groupUpdate: any) {
  const groupId = groupUpdate.id;
  if (!isGoodbyeEnabled(groupId)) {
    return;
  }

  const goodbyeMessageTemplate = getGoodbyeMessage(groupId);
  if (!goodbyeMessageTemplate) return;

  for (const participant of groupUpdate.participants) {
    const username = await getUsername(sock, participant);
    const groupMetadata = await sock.groupMetadata(groupId);
    const groupName = groupMetadata.subject;
    
    const goodbyeMessage = goodbyeMessageTemplate
      .replace(/@user/g, `@${username}`)
      .replace(/@group/g, groupName);

    const success = await safeSendMessage(sock, groupId, {
      text: goodbyeMessage,
      mentions: [participant]
    });

    if (success) {
      console.log(`👋 Message d'au revoir envoyé pour ${username} dans le groupe ${groupName}`);
    }
  }
}

async function handleParticipantPromote(sock: WASocket, groupUpdate: any) {
  const groupId = groupUpdate.id;
  for (const participant of groupUpdate.participants) {
    const username = await getUsername(sock, participant);
    console.log(`📈 ${username} a été promu admin dans le groupe ${groupId}`);
    await safeSendMessage(sock, groupId, { text: `Félicitations @${username} ! Vous êtes maintenant admin.`, mentions: [participant] });
  }
}

async function handleParticipantDemote(sock: WASocket, groupUpdate: any) {
  const groupId = groupUpdate.id;
  for (const participant of groupUpdate.participants) {
    const username = await getUsername(sock, participant);
    console.log(`📉 ${username} n'est plus admin dans le groupe ${groupId}`);
    await safeSendMessage(sock, groupId, { text: `@${username} n'est plus admin.`, mentions: [participant] });
  }
}

export async function handleGroupParticipantsUpdate(sock: WASocket, groupUpdate: any) {
  try {
    if (!groupUpdate || !sock) return;

    switch (groupUpdate.action) {
      case 'add':
        await handleParticipantAdd(sock, groupUpdate);
        break;
      case 'remove':
        await handleParticipantRemove(sock, groupUpdate);
        break;
      case 'promote':
        await handleParticipantPromote(sock, groupUpdate);
        break;
      case 'demote':
        await handleParticipantDemote(sock, groupUpdate);
        break;
    }
  } catch (e: any) {
    console.error('handleGroupParticipantsUpdate error:', e?.message || e);
  }
}

export async function handleGroupMetadataUpdate(sock: WASocket, groupUpdate: { id: string, subject?: string, desc?: string }) {
    try {
        if (!groupUpdate || !sock) return;

        const groupId = groupUpdate.id;

        if (groupUpdate.subject) {
            console.log(`✏️ Le nom du groupe ${groupId} a été changé en : ${groupUpdate.subject}`);
            await safeSendMessage(sock, groupId, { text: `Le nom du groupe a été changé en : *${groupUpdate.subject}*` });
        }

        if (groupUpdate.desc) {
            console.log(`📝 La description du groupe ${groupId} a été modifiée.`);
            await safeSendMessage(sock, groupId, { text: `La description du groupe a été modifiée.` });
        }
    } catch (e: any) {
        console.error('handleGroupMetadataUpdate error:', e?.message || e);
    }
}