/**
 * Modération simple
 * - block types: images/videos/audio/docs
 * - suppression et kick si nécessaire
 */
import type { WASocket } from '@whiskeysockets/baileys';
export declare const MOD_CONFIG: {
    blockImages: boolean;
    blockVideos: boolean;
    blockAudio: boolean;
    blockDocs: boolean;
    blockLinks: boolean;
    blockMentions: boolean;
    autoKickOnBan: boolean;
};
export declare function moderateMessage(sock: WASocket, msg: any): Promise<void>;
//# sourceMappingURL=moderation.d.ts.map