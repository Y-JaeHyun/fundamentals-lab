import { expect, test } from 'vitest';
import type { Course } from '../src/content/schema';
import { parseHash, toHash } from '../src/router';
import { chapter, course } from './content/helpers';

const courses = [course([chapter('00'), chapter('05'), chapter('a')])] as unknown as Course[];

test('parses course-chapter', () => {
  expect(parseHash('#ebpf-05', courses)).toEqual({ kind: 'chapter', course: 'ebpf', chapter: '05' });
  expect(parseHash('#ebpf-a', courses)).toEqual({ kind: 'chapter', course: 'ebpf', chapter: 'a' });
});

test('unknown routes fall back to map', () => {
  for (const h of ['', '#', '#nope', '#ebpf-99', '#ebpf-05/x', '#map', '#ebpf', '#other-05']) {
    expect(parseHash(h, courses)).toEqual({ kind: 'map' });
  }
});

test('round-trips toHash', () => {
  expect(toHash({ kind: 'map' })).toBe('#map');
  const r = { kind: 'chapter', course: 'ebpf', chapter: '05' } as const;
  expect(parseHash(toHash(r), courses)).toEqual(r);
});
