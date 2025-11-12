import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';
import { randomBytes } from 'crypto';
import mime from 'mime-types';
if (!existsSync(config.mediaDir))
    mkdirSync(config.mediaDir, { recursive: true });
export const saveMedia = (buffer, ext) => {
    const id = randomBytes(8).toString('hex');
    const fileExt = ext || 'bin';
    const path = join(config.mediaDir, `${id}.${fileExt}`);
    writeFileSync(path, buffer);
    return path;
};
export const guessExt = (mimetype) => {
    if (!mimetype)
        return 'bin';
    const ext = mime.extension(mimetype);
    return ext || 'bin';
};
//# sourceMappingURL=mediaStorage.js.map