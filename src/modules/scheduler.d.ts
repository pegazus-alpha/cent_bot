/**
 * Scheduler: envoie des messages planifiés
 * Utilise node-cron pour la simplicité
 */
import cron from 'node-cron';
import type { WASocket } from '@whiskeysockets/baileys';
export declare function scheduleJob(cronExpr: string, cb: () => void): cron.ScheduledTask;
export declare function startDefaultJobs(sock: WASocket): void;
//# sourceMappingURL=scheduler.d.ts.map