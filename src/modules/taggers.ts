/**
 * Fonctions de mention / tag
 * - tagAll: mentionne tous les participants d'un groupe
 * - tagAdmins: mentionne uniquement les admins
 */

import type { WASocket } from '@whiskeysockets/baileys';
import type { GroupMetadata, GroupParticipant } from '@whiskeysockets/baileys';

export async function tagAll(sock: WASocket, groupId: string, text = 'Attention à tous') {
  const meta: GroupMetadata = await sock.groupMetadata(groupId);
  const mentions = meta.participants.map((p: GroupParticipant) => p.id);
  await sock.sendMessage(groupId, { text, mentions });
}

export async function tagAdmins(sock: WASocket, groupId: string, text = 'Admins:') {
  const meta: GroupMetadata = await sock.groupMetadata(groupId);
  const admins = meta.participants.filter((p: any) => p.admin || p.isAdmin).map((p: any) => p.id);
  if (admins.length === 0) return;
  await sock.sendMessage(groupId, { text, mentions: admins });
}
