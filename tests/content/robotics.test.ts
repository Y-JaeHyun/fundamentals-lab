import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { loadCoursesFrom } from '../../src/content/load';
import { simValidators } from '../../src/sims/node-registry';

const dir = join(import.meta.dirname, '../../content/robotics');
const files = Object.fromEntries(readdirSync(dir).map((f) => [`/content/robotics/${f}`, readFileSync(join(dir, f), 'utf8')]));
const [robotics] = loadCoursesFrom(files, simValidators());

test('robotics course has 17 chapters 00..16 in order', () => {
  expect(robotics.chapters.map((c) => c.id)).toEqual(Array.from({ length: 17 }, (_, i) => String(i).padStart(2, '0')));
});

test('16 is links-only, others have 3..5 questions', () => {
  for (const c of robotics.chapters) {
    if (c.id === '16') expect(c.linksOnly).toBe(true);
    else expect(c.questions.length, c.id).toBeGreaterThanOrEqual(3);
  }
});

test('chapter 10 carries the topic-wiring simulation', () => {
  expect(robotics.chapters.find((c) => c.id === '10')?.sim?.kind).toBe('topic-wiring');
});
