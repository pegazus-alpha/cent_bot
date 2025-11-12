/**
 * Scheduler: envoie des messages planifiés
 * Utilise node-cron pour la simplicité
 */
import cron from 'node-cron';
import { config } from '../config.js';
// structure simple: array of jobs {cron, target, payload}
const jobs = [];
export function scheduleJob(cronExpr, cb) {
    const task = cron.schedule(cronExpr, cb);
    task.start();
    jobs.push(task);
    return task;
}
export function startDefaultJobs(sock) {
    // Exemple: envoi d'un message quotidien à 9h 
    scheduleJob('0 9 * * *', async () => {
        // ici la logique d'envoi vers un groupe ou une liste
        // ex: await sock.sendMessage('group@g.us', { text: 'Message quotidien' });
        console.log('Default daily job fired');
    });
}
//# sourceMappingURL=scheduler.js.map