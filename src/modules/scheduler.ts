/**
 * Scheduler: envoie des messages planifiés
 * Utilise node-cron pour la simplicité
 */

import cron from 'node-cron';
import type { WASocket } from '@whiskeysockets/baileys';
import { config } from '../config.js';

// structure simple: array of jobs {cron, target, payload}
const jobs: Array<any> = [];

export function scheduleJob(cronExpr: string, cb: () => void) {
  const task = cron.schedule(cronExpr, cb);
  task.start();
  jobs.push(task);
  return task;
}

export function startDefaultJobs(sock: WASocket) {
  // Exemple: envoi d'un message quotidien à 9h 
  scheduleJob('0 9 * * *', async () => {
    // ici la logique d'envoi vers un groupe ou une liste
    // ex: await sock.sendMessage('group@g.us', { text: 'Message quotidien' });
    console.log('Default daily job fired');
  });
}
