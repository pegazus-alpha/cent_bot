import type { Knex } from 'knex';
export declare const db: Knex;
export declare const createOrUpdateUser: (jid: string, name: string, role?: string) => Promise<void>;
export declare const saveMessage: (id: string, jid: string, groupId: string | null, body: string | null, mediaPath: string | null) => Promise<void>;
export declare const logModeration: (jid: string, action: string, reason: string) => Promise<void>;
export default db;
//# sourceMappingURL=db.d.ts.map