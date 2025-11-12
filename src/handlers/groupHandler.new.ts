/**
 * Group events: welcome / goodbye / update metadata
 */

import type { WASocket } from '@whiskeysockets/baileys';
import { createOrUpdateUser } from '../services/db.js';
import { isWelcomeEnabled, getWelcomeMessage } from '../services/groupSettings.js';

export async function handleGroupUpdate(sock: WASocket, ev: any) {
  try {
    if (!ev) return;
    // ev might be a "group-participants.update"
    if (ev.action && (ev.action === 'add' || ev.action === 'remove')) {
      for (const participant of ev.participants) {
        if (ev.action === 'add') {
          createOrUpdateUser(participant, 'unknown');
          
          // Vérifier si les messages de bienvenue sont activés pour ce groupe
          if (isWelcomeEnabled(ev.id)) {
            const welcomeMessage = getWelcomeMessage(ev.id);
            if (welcomeMessage) {
              // Envoyer le message personnalisé en privé
              await sock.sendMessage(participant, { 
                text: welcomeMessage
              });
              console.log(`📨 Message de bienvenue envoyé à ${participant} pour le groupe ${ev.id}`);
            }
          } else {
            console.log(`⏸️ Messages de bienvenue désactivés pour le groupe ${ev.id}`);
          }
          
        } else {
          // Message de départ (optionnel, peut aussi être configuré)
          await sock.sendMessage(participant, { 
            text: `👋 Au revoir ! Vous avez quitté le groupe. Vous êtes toujours le bienvenu si vous souhaitez revenir.`
          });
        }
      }
    }
  } catch (e) {
    console.error('handleGroupUpdate error', e);
  }
}