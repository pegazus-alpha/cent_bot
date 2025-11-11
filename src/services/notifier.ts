/**
 * Notifier: centralise l'envoi de messages (utilise sock)
 * Permet d'ajouter un niveau d'abstraction si tu veux throttle/batcher
 */

import type { WASocket } from '@whiskeysockets/baileys';

export async function sendText(sock: WASocket, to: string, text: string, quoted?: any) {
  return sock.sendMessage(to, { text }, quoted ? { quoted } : undefined);
}
