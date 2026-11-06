import { describe, expect, test } from 'vitest';
import { validateCourse } from '../../src/content/validate';
import { chapter, choice, course } from './helpers';

const errs = (raw: unknown, sims?: Parameters<typeof validateCourse>[1]) => validateCourse(raw, sims).errors;

describe('validateCourse', () => {
  test('accepts minimal valid course', () => {
    const r = validateCourse(course());
    expect(r.errors).toEqual([]);
    expect(r.course?.chapters[0].questions).toHaveLength(3);
  });

  test('rejects choice with zero or two correct options', () => {
    const e0 = errs(course([chapter('00', { questions: [choice('q1', 0), choice('q2'), choice('q3')] })]));
    const e2 = errs(course([chapter('00', { questions: [choice('q1'), choice('q2', 2), choice('q3')] })]));
    expect(e0.join('\n')).toContain('00/q1');
    expect(e2.join('\n')).toContain('00/q2');
  });

  test('rejects duplicate question ids in a chapter', () => {
    expect(errs(course([chapter('00', { questions: [choice('q1'), choice('q1'), choice('q3')] })])).join('\n')).toMatch(/00\/q1.*중복/);
  });

  test('rejects question without sources', () => {
    const q = { ...choice('q1'), sources: [] };
    expect(errs(course([chapter('00', { questions: [q, choice('q2'), choice('q3')] })])).join('\n')).toMatch(/00\/q1.*출처/);
  });

  test('requires 3..5 questions unless linksOnly', () => {
    expect(errs(course([chapter('00', { questions: [choice('q1'), choice('q2')] })]))).not.toEqual([]);
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((i) => choice(i));
    expect(errs(course([chapter('00', { questions: six })]))).not.toEqual([]);
    expect(errs(course([chapter('15', { questions: [], linksOnly: true })]))).toEqual([]);
  });

  test("rejects 'options' outside 2..4", () => {
    expect(errs(course([chapter('00', { questions: [choice('q1', 1, 1), choice('q2'), choice('q3')] })]))).not.toEqual([]);
    expect(errs(course([chapter('00', { questions: [choice('q1', 1, 5), choice('q2'), choice('q3')] })]))).not.toEqual([]);
  });

  test('rejects summary over 120 chars and feedback over 300 chars', () => {
    expect(errs(course([chapter('00', { summary: '가'.repeat(121) })]))).not.toEqual([]);
    const q = choice('q1');
    q.options[0].feedback = '가'.repeat(301);
    expect(errs(course([chapter('00', { questions: [q, choice('q2'), choice('q3')] })]))).not.toEqual([]);
  });

  test('accepts order question and rejects one with fewer than 2 items', () => {
    const ok = { id: 'o1', kind: 'order', prompt: '순서', items: ['a', 'b', 'c'], feedback: '설명', sources: [{ path: 'x' }] };
    expect(errs(course([chapter('00', { questions: [ok, choice('q2'), choice('q3')] })]))).toEqual([]);
    const bad = { ...ok, items: ['a'] };
    expect(errs(course([chapter('00', { questions: [bad, choice('q2'), choice('q3')] })]))).not.toEqual([]);
  });

  test('rejects unknown sim kind', () => {
    expect(errs(course([chapter('00', { sim: { kind: 'nope', data: {}, sources: [{ path: 'x' }] } })])).join('\n')).toMatch(/00.*nope/);
  });

  test('runs sim validator and prefixes errors with chapter id', () => {
    const c = course([chapter('05', { sim: { kind: 'verifier', data: {}, sources: [{ path: 'x' }] } })]);
    expect(errs(c, { verifier: () => ['케이스 부족'] })).toEqual(['05/sim: 케이스 부족']);
  });

  test('chapter ids are lowercase [0-9a-z]+', () => {
    expect(errs(course([chapter('A')]))).not.toEqual([]);
    expect(errs(course([chapter('a')]))).toEqual([]);
  });

  test('rejects non-object input', () => {
    expect(errs(null)).not.toEqual([]);
  });
});
