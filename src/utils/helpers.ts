import type { WASocket } from '@whiskeysockets/baileys';

export const now = () => Date.now();

export const short = (s: string | undefined, l = 100) => {
  if (!s) return '';
  return s.length > l ? s.slice(0, l) + '...' : s;
};

export const jidToNumber = (jid: string) => {
  return jid.split('@')[0];
};

export const getUsername = async (sock: WASocket, jid: string): Promise<string> => {
    try {
        const user = await sock.onWhatsApp(jid);
        if (user && user.length > 0 && user[0].exists) {
            const fetchedUser = await sock.getContact(jid);
            return fetchedUser?.name || fetchedUser?.notify || jid.split('@')[0];
        }
    } catch (e) {
        console.error("Erreur lors de la récupération du nom d'utilisateur:", e);
    }
    return jid.split('@')[0];
};
