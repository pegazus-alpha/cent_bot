/**
 * Status handler: download status updates and optionally reply
 */
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { saveMedia, guessExt } from '../services/mediaStorage.js';
export async function handleStatusUpdates(sock, updates) {
    try {
        for (const s of updates) {
            // s contains user status meta; use helper functions to download if needed
            if (s && s?.stale === false) {
                console.log('Status update from', s.id);
                // Marquer le statut comme lu automatiquement
                try {
                    await sock.readMessages([{
                            remoteJid: s.id,
                            id: s.messageStubParameters?.[0] || s.key?.id,
                            participant: s.key?.participant
                        }]);
                    console.log('✅ Statut marqué comme lu:', s.id);
                }
                catch (readError) {
                    console.warn('⚠️ Impossible de marquer le statut comme lu:', readError?.message || readError);
                }
                // If needed, download via downloadContentFromMessage
            }
        }
    }
    catch (e) {
        console.error('handleStatusUpdates error', e);
    }
}
//# sourceMappingURL=statutHandler.js.map