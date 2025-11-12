/**
 * Notifier: centralise l'envoi de messages (utilise sock)
 * Permet d'ajouter un niveau d'abstraction si tu veux throttle/batcher
 */
import type { WASocket } from '@whiskeysockets/baileys';
export declare function sendText(sock: WASocket, to: string, text: string, quoted?: any): Promise<import("@whiskeysockets/baileys").proto.WebMessageInfo | undefined>;
//# sourceMappingURL=notifier.d.ts.map