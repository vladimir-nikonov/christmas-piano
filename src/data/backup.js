// Backup file format and validation of files picked for restore.

import { tx } from '../i18n/index.js';
import { AVATARS } from '../ui/art.js';

export const BACKUP_FORMAT = 'snezhnye-noty-backup', BACKUP_EVERY = 7 * 864e5;
// Returns { db } for a valid backup (or a raw db object), otherwise { error }.
export function parseBackup(text){
  let d; try { d = JSON.parse(text); } catch(e){ return { error: tx('eJson') }; }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { error: tx('eNot') };
  if (d.format !== undefined && d.format !== BACKUP_FORMAT) return { error: tx('eOther') };
  if (typeof d.version === 'number' && d.version > 1) return { error: tx('eNewer') };
  if (!Array.isArray(d.profiles) || !d.profiles.length) return { error: tx('eEmpty') };
  if (d.profiles.length > 100) return { error: tx('eMany') };
  const ids = new Set();
  for (const p of d.profiles){
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' || !p.id || p.id.length > 64 || ids.has(p.id)) return { error: tx('ePlayer') };
    if (p.name !== undefined && (typeof p.name !== 'string' || p.name.length > 40)) return { error: tx('eName') };
    if (p.level !== undefined && !(Number.isFinite(+p.level) && +p.level >= 0)) return { error: tx('eLevel') };
    if (p.avatar !== undefined && !(Number.isInteger(+p.avatar) && +p.avatar >= 0 && +p.avatar < AVATARS.length)) return { error: tx('eAvatar') };
    ids.add(p.id);
  }
  return { db: d };
}
