import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname } from 'path';
import { config } from '../config.js';

const ensureDataDir = () => {
  const dir = dirname(config.sessionFile);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

export function loadState(): any {
  try {
    if (!existsSync(config.sessionFile)) return {};
    const raw = readFileSync(config.sessionFile, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn('No previous session found');
    return {};
  }
}

export function saveState(state: any) {
  ensureDataDir();
  writeFileSync(config.sessionFile, JSON.stringify(state, null, 2));
}
