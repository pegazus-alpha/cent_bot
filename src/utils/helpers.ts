import type { WASocket } from '@whiskeysockets/baileys';
import { jidNormalizedUser, proto } from '@whiskeysockets/baileys';

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
            const fetchedContact = await sock.query({
                tag: 'iq',
                type: 'get',
                query: ['profile', 'query'],
                content: [{ tag: 'user', attrs: { jid: normalizedJid, type: 'status' } }],
            }) as proto.Contact;

            if (fetchedContact) {
                return fetchedContact.name || fetchedContact.notify || normalizedJid.split('@')[0] as string;
            }
        }
    } catch (e) {
        console.error("Erreur lors de la récupération du nom d'utilisateur:", e);
    }
    return jid.split('@')[0] as string;
};
