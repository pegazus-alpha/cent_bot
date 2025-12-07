import type { WASocket } from '@whiskeysockets/baileys';
import { jidNormalizedUser } from '@whiskeysockets/baileys';

export const now = () => Date.now();

export const short = (s: string | undefined, l = 100) => {
  if (!s) return '';
  return s.length > l ? s.slice(0, l) + '...' : s;
};

export const jidToNumber = (jid: string) => {
  return jidNormalizedUser(jid).split('@')[0] as string;
};

export const getUsername = async (sock: WASocket, jid: string): Promise<string> => {
    try {
        const normalizedJid = jidNormalizedUser(jid);
        const user = await sock.onWhatsApp(normalizedJid);
        if (user && user.length > 0 && user[0] && user[0].exists) {
            const contact = sock.contacts[normalizedJid];
            if (contact) {
                return contact.name || contact.notify || normalizedJid.split('@')[0] as string;
            }
        }
    } catch (e) {
        console.error("Erreur lors de la récupération du nom d'utilisateur:", e);
    }
    return jid.split('@')[0] as string;
};
