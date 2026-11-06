import { expect, test } from 'vitest';
import type { Course } from '../../src/content/schema';
import { checkCourseSources, type RepoReader } from '../../src/content/sources';
import { chapter, choice, course } from './helpers';

const FILES: Record<string, string> = {
  'chapters/05-verifier/out/a.log': 'line one\n  R0 invalid mem access\nlast\n',
  'chapters/05-verifier/README.md': '# 05\n',
};
const repo: RepoReader = { exists: (p) => p in FILES, read: (p) => FILES[p] ?? '' };

function withQ(q: object, extra: object = {}) {
  return course([chapter('05', { questions: [q, choice('q2'), choice('q3')], ...extra })]) as unknown as Course;
}
const q1 = (extra: object) => ({ ...choice('q1'), sources: [{ path: 'chapters/05-verifier/out/a.log' }], ...extra });

const okRepo: RepoReader = { exists: () => true, read: (p) => FILES[p] ?? 'line one\n' };

test('passes when all paths and lines exist', () => {
  expect(checkCourseSources(withQ(q1({ log: 'R0 invalid mem access\n\nline one' })), okRepo)).toEqual([]);
});

test('fails on missing path', () => {
  const errs = checkCourseSources(withQ(q1({})), repo);
  expect(errs.join('\n')).toMatch(/05\/q2.*chapters\/00-setup\/README.md/);
});

test('fails when quoted line missing', () => {
  const errs = checkCourseSources(withQ(q1({ log: 'R0 invalid mem access\nR9 made up' })), okRepo);
  expect(errs).toHaveLength(1);
  expect(errs[0]).toMatch(/05\/q1.*R9 made up/);
});

test('checks option logs, code and run.expect', () => {
  const q = q1({ code: 'not in file' });
  (q.options[1] as { log?: string }).log = 'also missing';
  const c = withQ(q, { run: { cmd: 'make run', expect: 'nope', sources: [{ path: 'chapters/05-verifier/out/a.log' }] } });
  const errs = checkCourseSources(c, okRepo).join('\n');
  expect(errs).toMatch(/not in file/);
  expect(errs).toMatch(/also missing/);
  expect(errs).toMatch(/05\/run.*nope/);
});

test('ignores ellipsis lines', () => {
  expect(checkCourseSources(withQ(q1({ log: 'line one\n...\n…' })), okRepo)).toEqual([]);
});

test('checks sim quoted lines', () => {
  const c = withQ(q1({}), { sim: { kind: 'verifier', data: { x: 1 }, sources: [{ path: 'chapters/05-verifier/out/a.log' }] } });
  const errs = checkCourseSources(c, okRepo, () => ['line one', 'ghost line']);
  expect(errs).toEqual([expect.stringMatching(/05\/sim.*ghost line/)]);
});
