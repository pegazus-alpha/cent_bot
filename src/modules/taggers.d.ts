/**
 * Fonctions de mention / tag
 * - tagAll: mentionne tous les participants d'un groupe
 * - tagAdmins: mentionne uniquement les admins
 */
import type { WASocket } from '@whiskeysockets/baileys';
export declare function tagAll(sock: WASocket, groupId: string, text?: string): Promise<void>;
export declare function tagAdmins(sock: WASocket, groupId: string, text?: string): Promise<void>;
//# sourceMappingURL=taggers.d.ts.map