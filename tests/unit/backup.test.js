import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup, BACKUP_FORMAT } from '../../src/data/backup.js';
import { I18N } from '../../src/i18n/index.js';

const en = I18N.en;
const file = (o) => JSON.stringify({ format: BACKUP_FORMAT, version: 1, profiles: [{ id: 'p1', name: 'Ann', level: 1, avatar: 0 }], ...o });

test('a valid backup is accepted', () => {
  const r = parseBackup(file());
  assert.equal(r.error, undefined);
  assert.equal(r.db.profiles[0].name, 'Ann');
});

test('a raw database object without the format field is accepted (older exports)', () => {
  assert.ok(parseBackup(JSON.stringify({ profiles: [{ id: 'p1' }] })).db);
});

test('broken or foreign files are rejected with a reason', () => {
  const cases = [
    ['not json', en.eJson],
    ['[1]', en.eNot],
    [file({ format: 'other-app' }), en.eOther],
    [file({ version: 2 }), en.eNewer],
    [file({ profiles: [] }), en.eEmpty],
    [file({ profiles: Array.from({ length: 101 }, (_, i) => ({ id: 'p' + i })) }), en.eMany],
    [file({ profiles: [{ id: 'a' }, { id: 'a' }] }), en.ePlayer],
    [file({ profiles: [{ id: 'a', name: 'x'.repeat(41) }] }), en.eName],
    [file({ profiles: [{ id: 'a', level: -1 }] }), en.eLevel],
    [file({ profiles: [{ id: 'a', avatar: 999 }] }), en.eAvatar],
  ];
  for (const [text, msg] of cases) assert.equal(parseBackup(text).error, msg, text.slice(0, 60));
});
