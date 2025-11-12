/**
 * Message handler: point d'entrée pour les messages entrants
 * - route vers commandes
 * - viewonce
 * - moderation
 * - sauvegarde en base
 */

import type { WASocket } from '@whiskeysockets/baileys';
import { handleCommand } from './commandHandler.js';
import { handleGroupManagementCommands } from './groupManagementHandler.js';
import { handleInteractiveCommand } from './interactiveGroupHandler.js';
import { handleViewOnce } from '../modules/viewonce.js';
import { moderateMessage } from '../modules/moderation.js';
import { saveMessage, createOrUpdateUser } from '../services/db.js';
import { short } from '../utils/helpers.js';

export async function handleMessage(sock: WASocket, upsert: any) {
  try {
    const messages = upsert?.messages || [];
    for (const message of messages) {
      if (!message.message) continue;
      const key = message.key;
      const from = key.remoteJid;
      const participant = key.participant || key.remoteJid;

      // Save minimal user info
      createOrUpdateUser(participant, 'unknown');

      // Save to DB
      const body = message.message?.conversation || message.message?.extendedTextMessage?.text || JSON.stringify(message.message)?.slice(0, 200);
      saveMessage(key.id || `${Date.now()}`, participant, from || null, short(String(body), 500), null);

      // Moderation check
      await moderateMessage(sock, message);

      // ViewOnce handling
      await handleViewOnce(sock, message);

      // Commands (messages starting with / or !)
      const text = (message.message?.conversation || message.message?.extendedTextMessage?.text || '').trim();
      if (text && (text.startsWith('/') || text.startsWith('!'))) {
        // D'abord vérifier les commandes interactives (priorité)
        const interactiveHandled = await handleInteractiveCommand(sock, from, text);
        
        if (!interactiveHandled) {
          // Ensuite vérifier les commandes de gestion des groupes (privé uniquement)
          const handled = await handleGroupManagementCommands(sock, message, text);
          
          // Si pas géré par les commandes de groupe, essayer les commandes normales
          if (!handled) {
            await handleCommand(sock, message, text);
          }
        }
      } else if (text) {
        // Vérifier si c'est une réponse à une session interactive (même sans / ou !)
        const interactiveHandled = await handleInteractiveCommand(sock, from, text);
      }

      // TODO: add routing to AI processor (Groq/Ollama) - optional
    }
  } catch (e) {
    console.error('handleMessage error', e);
  }
}
