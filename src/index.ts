/**
 * Entrypoint: init Baileys, charge session, branche handlers
 */

import makeWASocket, { fetchLatestBaileysVersion, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

// Handlers
import { handleMessage } from './handlers/messageHandler.js';
import { handleGroupParticipantsUpdate, handleGroupMetadataUpdate } from './handlers/groupHandler.js';

// Services  
import { registerGroup, unregisterGroup } from './services/groupSettings.js';

// Modules (jobs planifiés, rappels, etc.)
import { startDefaultJobs } from './modules/scheduler.js';

// Services - initialisation 
import './services/groupSettings.js';

// Configuration
import { config } from './config.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Variables globales pour l'état de connexion
let isConnected = false;
let currentSocket: WASocket | null = null;
let isReconnecting = false;

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('💥 Erreur non capturée:', error);
  // Ne pas quitter le processus, juste logger
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promise rejetée non gérée:', reason);
});

/**
 * Fonction utilitaire pour vérifier la connexion
 */
export function isSocketConnected(): boolean {
  return isConnected && currentSocket !== null;
}

/**
 * Fonction utilitaire pour envoyer des messages en sécurité
 */
export async function safeSendMessage(jid: string, content: any): Promise<boolean> {
  if (!isSocketConnected()) {
    console.warn('🚫 Impossible d\'envoyer un message: socket non connecté');
    return false;
  }
  
  try {
    await currentSocket!.sendMessage(jid, content);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du message:', error);
    return false;
  }
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('💥 Exception non gérée:', error);
  // Ne pas faire crasher complètement, log et continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promesse rejetée non gérée:', reason);
  // Pour les timeouts WhatsApp, ne pas crasher
  if (reason instanceof Error && reason.message.includes('Timed Out')) {
    console.warn('⏰ Timeout WhatsApp détecté - connexion instable mais continuons...');
    return;
  }
  // Ne pas faire crasher complètement, log et continue
});

async function start(): Promise<WASocket> {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

  // Force tuple pour TypeScript
  const { version } = await fetchLatestBaileysVersion().catch(
    () => ({ version: [2, 2204, 10] as [number, number, number] })
  );

  const sock = makeWASocket({
    auth: state,
    version,
    logger,
    // Paramètres améliorés pour connexions instables
    retryRequestDelayMs: 10000, // 10 secondes au lieu de 5
    maxMsgRetryCount: 5, // Plus de tentatives
    connectTimeoutMs: 60000, // Timeout de connexion de 60 secondes
    defaultQueryTimeoutMs: 30000, // Timeout des requêtes de 30 secondes
    keepAliveIntervalMs: 10000, // Keep alive toutes les 10 secondes
    // Réduire la fréquence des heartbeats
    markOnlineOnConnect: false,
  });

  // Mettre à jour la référence globale
  currentSocket = sock;

  // Sauvegarde automatique des credentials
  sock.ev.on('creds.update', saveCreds);

  // Connection events
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    logger.info({ update }, '📡 Connection update');

    // Afficher le QR code dans le terminal
    if (qr) {
      console.log('\n🔗 Scannez ce QR code avec WhatsApp :');
      qrcode.generate(qr, { small: true });
      console.log('\n');
    }

    if (connection === 'close') {
      isConnected = false;
      currentSocket = null;
      
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      
      logger.warn({ message: '🔌 Connexion fermée', statusCode, shouldReconnect });
      
      if (shouldReconnect && !isReconnecting) {
        isReconnecting = true;
        
        // Attendre plus longtemps avant de se reconnecter pour éviter les timeouts
        const reconnectDelay = 10000; // 10 secondes d'attente
        logger.info(`⏳ Attente de ${reconnectDelay/1000}s avant reconnexion...`);
        
        setTimeout(async () => {
          try {
            logger.info('🔄 Tentative de reconnexion...');
            await start();
          } catch (error: any) {
            // Gestion spéciale pour les timeouts
            if (error?.message?.includes('Timed Out')) {
              logger.warn('⏰ Timeout lors de la reconnexion - nouvelle tentative dans 30s');
              setTimeout(() => {
                isReconnecting = false;
                // Relancer une reconnexion après timeout
                if (!isConnected) {
                  start().catch(console.error);
                }
              }, 30000);
            } else {
              logger.error({ message: '❌ Erreur lors de la reconnexion', error: error?.message || error });
              isReconnecting = false;
            }
          }
        }, reconnectDelay);
        
      } else if (!shouldReconnect) {
        logger.error('🚪 Session fermée définitivement (logged out)');
        process.exit(1);
      }
    } else if (connection === 'open') {
      isConnected = true;
      isReconnecting = false;
      logger.info('✅ Connecté à WhatsApp avec succès.');
      
      // Découvrir et enregistrer automatiquement les groupes
      (async () => {
        try {
          const groups = await sock.groupFetchAllParticipating();
          for (const [groupId, groupData] of Object.entries(groups)) {
            await registerGroup(groupId, groupData.subject || 'Groupe sans nom');
          }
          console.log(`🔍 ${Object.keys(groups).length} groupes découverts et enregistrés`);
        } catch (error) {
          console.warn('⚠️ Impossible de récupérer la liste des groupes:', error);
        }
      })();
    } else if (connection === 'connecting') {
      isConnected = false;
      logger.info('🔄 Connexion en cours...');
    }
  });

  // Messages entrants
  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type === 'notify') {
        await handleMessage(sock, m);
      }
    } catch (e: any) {
      logger.error('❌ Erreur dans messageHandler', e?.message || e);
      // Ne pas faire crasher le bot pour une erreur de message
    }
  });

  // Participants de groupe
  sock.ev.on('group-participants.update', async (ev) => {
    try {
      await handleGroupParticipantsUpdate(sock, ev);
    } catch (e: any) {
      logger.error('❌ Erreur dans groupHandler', e?.message || e);
      // Ne pas faire crasher le bot pour une erreur de groupe
    }
  });

  // Détection des nouveaux groupes et départs
  sock.ev.on('groups.update', async (updates) => {
    try {
      for (const update of updates) {
        if (update.id) {
          // Fix: `update` is `Partial<GroupMetadata>`, but `handleGroupMetadataUpdate` expects a required `id`.
          // We create a new object that satisfies the type.
          const groupUpdateData: { id: string; subject?: string; desc?: string } = {
            id: update.id,
          };
          if (update.subject !== undefined) {
            groupUpdateData.subject = update.subject;
          }
          if (update.desc !== undefined) {
            groupUpdateData.desc = update.desc;
          }
          await handleGroupMetadataUpdate(sock, groupUpdateData);
          if (update.subject) {
            // Nouveau groupe ou nom modifié
            await registerGroup(update.id, update.subject);
          }
        }
      }
    } catch (e: any) {
      logger.error('❌ Erreur lors de la mise à jour des groupes', e?.message || e);
    }
  });

  // Statuts
  sock.ev.on('statuses.update' as any, (updates) => {
    if (Array.isArray(updates)) {
      logger.info(`📌 ${updates.length} statuts mis à jour`);
    } else {
      logger.info('📌 Status update reçu');
    }
  });

  // Jobs planifiés
  startDefaultJobs(sock);

  return sock;
}

start().catch((e) => {
  console.error('⛔ Erreur critique au démarrage :', e);
  process.exit(1);
});
