/**
 * Entrypoint: init Baileys, charge session, branche handlers
 */
import makeWASocket, { fetchLatestBaileysVersion, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
// Handlers
import { handleMessage } from './handlers/messageHandler.js';
import { handleGroupUpdate } from './handlers/groupHandler.js';
// Modules (jobs planifiés, rappels, etc.)
import { startDefaultJobs } from './modules/scheduler.js';
// Configuration
import { config } from './config.js';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    // Force tuple pour TypeScript
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 2204, 10] }));
    const sock = makeWASocket({
        auth: state,
        version,
        logger
    });
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
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                logger.warn('🔌 Connexion fermée. Tentative de reconnexion...');
                start();
            }
            else {
                logger.error('🚪 Session fermée (logged out)');
            }
        }
        else if (connection === 'open') {
            logger.info('✅ Connecté à WhatsApp avec succès.');
        }
    });
    // Messages entrants
    sock.ev.on('messages.upsert', async (m) => {
        try {
            if (m.type === 'notify') {
                await handleMessage(sock, m);
            }
        }
        catch (e) {
            logger.error('❌ Erreur dans messageHandler', e);
        }
    });
    // Participants de groupe
    sock.ev.on('group-participants.update', async (ev) => {
        try {
            await handleGroupUpdate(sock, ev);
        }
        catch (e) {
            logger.error('❌ Erreur dans groupHandler', e);
        }
    });
    // Statuts
    sock.ev.on('statuses.update', (updates) => {
        if (Array.isArray(updates)) {
            logger.info(`📌 ${updates.length} statuts mis à jour`);
        }
        else {
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
//# sourceMappingURL=index.js.map