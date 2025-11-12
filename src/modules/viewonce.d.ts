/**
 * Module ViewOnce
 * - détecte les messages view-once
 * - télécharge et sauvegarde le media
 * - renvoie une copie normale vers le destinataire "owner" (optionnel)
 *
 * NOTE: l'utilisation d'un bot non-officiel pour contourner view-once a des implications éthiques.
 */
import { proto } from '@whiskeysockets/baileys';
import type { WASocket } from '@whiskeysockets/baileys';
export declare function handleViewOnce(sock: WASocket, message: proto.IWebMessageInfo): Promise<string | null>;
//# sourceMappingURL=viewonce.d.ts.map