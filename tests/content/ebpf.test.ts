import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { loadCoursesFrom } from '../../src/content/load';
import { simValidators } from '../../src/sims/node-registry';

const dir = join(import.meta.dirname, '../../content/ebpf');
const files = Object.fromEntries(readdirSync(dir).map((f) => [`/content/ebpf/${f}`, readFileSync(join(dir, f), 'utf8')]));
const [ebpf] = loadCoursesFrom(files, simValidators());

test('ebpf course has 17 chapters in README order', () => {
  expect(ebpf.chapters.map((c) => c.id)).toEqual(['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', 'a']);
});

test('every chapter except 15 has 3..5 questions', () => {
  for (const c of ebpf.chapters) {
    if (c.id === '15') expect(c.linksOnly).toBe(true);
    else expect(c.questions.length, c.id).toBeGreaterThanOrEqual(3);
  }
});

test('sims present for 01,04,05,09,10,11', () => {
  expect(ebpf.chapters.filter((c) => c.sim).map((c) => c.id)).toEqual(['01', '04', '05', '09', '10', '11']);
});

test('slugs match course repo chapter directories', () => {
  for (const c of ebpf.chapters) expect(c.slug.startsWith(c.id === 'a' ? 'A-' : `${c.id}-`), c.slug).toBe(true);
});
