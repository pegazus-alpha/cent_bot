/**
 * Notifier: centralise l'envoi de messages (utilise sock)
 * Permet d'ajouter un niveau d'abstraction si tu veux throttle/batcher
 */
export async function sendText(sock, to, text, quoted) {
    return sock.sendMessage(to, { text }, quoted ? { quoted } : undefined);
}
//# sourceMappingURL=notifier.js.map