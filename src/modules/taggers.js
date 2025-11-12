/**
 * Fonctions de mention / tag
 * - tagAll: mentionne tous les participants d'un groupe
 * - tagAdmins: mentionne uniquement les admins
 */
export async function tagAll(sock, groupId, text = 'Attention à tous') {
    const meta = await sock.groupMetadata(groupId);
    const mentions = meta.participants.map((p) => p.id);
    await sock.sendMessage(groupId, { text, mentions });
}
export async function tagAdmins(sock, groupId, text = 'Admins:') {
    const meta = await sock.groupMetadata(groupId);
    const admins = meta.participants.filter((p) => p.admin || p.isAdmin).map((p) => p.id);
    if (admins.length === 0)
        return;
    await sock.sendMessage(groupId, { text, mentions: admins });
}
//# sourceMappingURL=taggers.js.map