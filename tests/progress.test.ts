import { expect, test } from 'vitest';
import type { Chapter } from '../src/content/schema';
import { createProgressStore } from '../src/progress';
import { chapter, choice } from './content/helpers';

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}
const ch = chapter('05') as unknown as Chapter;
const withSim = { ...ch, sim: { kind: 'verifier', data: {}, sources: [] } } as Chapter;

test('starts new', () => {
  expect(createProgressStore(mem()).status('ebpf', ch)).toBe('new');
});

test('sim plus all answers is done', () => {
  const s = createProgressStore(mem());
  for (const q of ['q1', 'q2', 'q3']) s.markCorrect('ebpf', '05', q);
  expect(s.status('ebpf', withSim)).toBe('in-progress');
  s.markSim('ebpf', '05');
  expect(s.status('ebpf', withSim)).toBe('done');
  expect(s.status('ebpf', ch)).toBe('done');
});

test('status ignores unknown ids', () => {
  const s = createProgressStore(mem());
  for (const q of ['q1', 'q2', 'q3', 'gone']) s.markCorrect('ebpf', '05', q);
  expect(s.status('ebpf', ch)).toBe('done');
});

test('new question reopens chapter', () => {
  const s = createProgressStore(mem());
  for (const q of ['q1', 'q2', 'q3']) s.markCorrect('ebpf', '05', q);
  const grown = { ...ch, questions: [...ch.questions, choice('q4')] } as Chapter;
  expect(s.status('ebpf', grown)).toBe('in-progress');
});

test('linksOnly chapter stays new', () => {
  const s = createProgressStore(mem());
  expect(s.status('ebpf', { ...ch, questions: [], linksOnly: true })).toBe('new');
});

test('survives throwing storage', () => {
  const boom = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  const s = createProgressStore(boom);
  s.markCorrect('ebpf', '05', 'q1');
  expect(s.get('ebpf', '05').answers.q1).toBe(true);
  expect(createProgressStore(null).status('ebpf', ch)).toBe('new');
});

test('resets corrupt json', () => {
  const st = mem();
  st.setItem('fundamentals-lab:v1', '{not json');
  expect(createProgressStore(st).get('ebpf', '05')).toEqual({ sim: false, answers: {} });
  st.setItem('fundamentals-lab:v1', '[1,2]');
  expect(createProgressStore(st).get('ebpf', '05')).toEqual({ sim: false, answers: {} });
});

test('persists across store instances', () => {
  const st = mem();
  createProgressStore(st).markSim('ebpf', '05');
  expect(createProgressStore(st).get('ebpf', '05').sim).toBe(true);
});
