/**
 * Message handler: point d'entrée pour les messages entrants
 * - route vers commandes
 * - viewonce
 * - moderation
 * - sauvegarde en base
 */
import type { WASocket } from '@whiskeysockets/baileys';
export declare function handleMessage(sock: WASocket, upsert: any): Promise<void>;
//# sourceMappingURL=messageHandler.d.ts.map