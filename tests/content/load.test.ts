import { expect, test } from 'vitest';
import { stringify } from 'yaml';
import { loadCoursesFrom } from '../../src/content/load';
import { chapter, course } from './helpers';

function files() {
  const { chapters: _c, ...meta } = course();
  return {
    '/content/ebpf/course.yaml': stringify({ ...meta, chapters: ['05', '00'] }),
    '/content/ebpf/00.yaml': stringify(chapter('00')),
    '/content/ebpf/05.yaml': stringify(chapter('05')),
  };
}

test('loads courses in course.yaml order', () => {
  const [c] = loadCoursesFrom(files());
  expect(c.chapters.map((x) => x.id)).toEqual(['05', '00']);
});

test('throws listing missing chapter file', () => {
  const f = files();
  delete (f as Record<string, string>)['/content/ebpf/00.yaml'];
  expect(() => loadCoursesFrom(f)).toThrow(/00/);
});

test('throws on chapter file not listed in course.yaml', () => {
  const f = { ...files(), '/content/ebpf/09.yaml': stringify(chapter('09')) };
  expect(() => loadCoursesFrom(f)).toThrow(/09/);
});

test('throws with validation errors', () => {
  const f = { ...files(), '/content/ebpf/00.yaml': stringify(chapter('00', { questions: [] })) };
  expect(() => loadCoursesFrom(f)).toThrow(/00: 문제는 3~5개/);
});
