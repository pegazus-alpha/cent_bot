import type { WASocket, BinaryNode } from '@whiskeysockets/baileys';
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
            const queryBody: BinaryNode = {
                tag: 'iq',
                attrs: {
                    to: 's.whatsapp.net', // Query the WhatsApp server
                    xmlns: 'profile', // XML namespace for profile queries
                    id: Math.random().toString(36).substring(2, 15), // Unique ID
                },
                content: [{
                    tag: 'query',
                    attrs: {}, // No specific attrs for query tag here
                    content: [{
                        tag: 'user', // Specific tag for user profile
                        attrs: {
                            jid: normalizedJid,
                            type: 'status', // Requesting status and profile
                        }
                    }]
                }]
            };

            const fetchedContact = await sock.query(queryBody) as BinaryNode;

            let userNode: BinaryNode | undefined;
            if (Array.isArray(fetchedContact.content)) {
                const profileNode = fetchedContact.content.find((node: BinaryNode | string | Uint8Array) => typeof node !== 'string' && (node as BinaryNode).tag === 'profile') as BinaryNode | undefined;
                if (profileNode && Array.isArray(profileNode.content)) {
                    userNode = profileNode.content.find((node: BinaryNode | string | Uint8Array) => typeof node !== 'string' && (node as BinaryNode).tag === 'user') as BinaryNode | undefined;
                }
            }

            if (userNode) {
                return userNode.attrs.name || userNode.attrs.notify || normalizedJid.split('@')[0] as string;
            }
        }
    } catch (e) {
        console.error("Erreur lors de la récupération du nom d'utilisateur:", e);
    }
    return jid.split('@')[0] as string;
};
