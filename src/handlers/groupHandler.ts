/**
 * Group events: welcome / goodbye / update metadata
 * Version sécurisée avec gestion des déconnexions
 */

import type { WASocket } from '@whiskeysockets/baileys';
import { createOrUpdateUser } from '../services/db.js';
import { isWelcomeEnabled, getWelcomeMessage } from '../services/groupSettings.js';

/**
 * Fonction sécurisée pour envoyer des messages
 */
async function safeSendMessage(sock: WASocket, jid: string, content: any): Promise<boolean> {
  try {
    // Vérifier que la socket existe et est connectée
    if (!sock || typeof sock.sendMessage !== 'function') {
      console.warn('🚫 Socket non valide pour l\'envoi de message');
      return false;
    }
    
    await sock.sendMessage(jid, content);
    return true;
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'envoi du message:', error?.message || error);
    // Si c'est une erreur de connexion, ne pas relancer
    if (error?.output?.statusCode === 428 || error?.message?.includes('Connection Closed')) {
      console.warn('⚠️ Connexion fermée, message non envoyé');
    }
    return false;
  }
}

export async function handleGroupUpdate(sock: WASocket, ev: any) {
  try {
    if (!ev || !sock) return;
    
    // ev might be a "group-participants.update"
    if (ev.action && (ev.action === 'add' || ev.action === 'remove')) {
      for (const participant of ev.participants) {
        if (ev.action === 'add') {
          // Sauvegarder l'utilisateur en base
          try {
            await createOrUpdateUser(participant, 'unknown');
          } catch (dbError) {
            console.error('❌ Erreur lors de la sauvegarde utilisateur:', dbError);
          }
          
          // Vérifier si les messages de bienvenue sont activés pour ce groupe
          if (isWelcomeEnabled(ev.id)) {
            const welcomeMessage = getWelcomeMessage(ev.id);
            if (welcomeMessage) {
              // Envoyer le message personnalisé en privé avec retry
              const success = await safeSendMessage(sock, participant, { 
                text: welcomeMessage
              });
              
              if (success) {
                console.log(`📨 Message de bienvenue envoyé à ${participant} pour le groupe ${ev.id}`);
              } else {
                console.warn(`⚠️ Échec de l'envoi du message de bienvenue à ${participant}`);
              }
            }
          } else {
            console.log(`⏸️ Messages de bienvenue désactivés pour le groupe ${ev.id}`);
          }
          
        } else if (ev.action === 'remove') {
          // Message de départ (optionnel, peut aussi être configuré)
          const success = await safeSendMessage(sock, participant, { 
            text: `👋 Au revoir ! Vous avez quitté le groupe. Vous êtes toujours le bienvenu si vous souhaitez revenir.`
          });
          
          if (success) {
            console.log(`📨 Message d'au revoir envoyé à ${participant}`);
          }
        }
      }
    }
  } catch (e: any) {
    console.error('handleGroupUpdate error:', e?.message || e);
  }
}