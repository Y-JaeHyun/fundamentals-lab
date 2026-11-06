import { expect, test } from 'vitest';
import { emptyState, isComplete, pickOption, validateVerifier, verifierQuoted, type VerifierData } from '../../src/sims/verifier/model';

function mk(id: string) {
  return {
    id,
    title: `케이스 ${id}`,
    code: 'a\nb\nc',
    hot: 2,
    fixed: 'a\nfix\nb\nc',
    badLog: `bad ${id}`,
    goodLog: `good ${id}`,
    options: [
      { text: '정답', correct: true, feedback: '맞아요' },
      { text: '오답', feedback: '아니에요', log: `opt ${id}` },
    ],
  };
}
const data: VerifierData = { cases: [mk('a'), mk('b'), mk('c')] };

test('accepts valid data', () => {
  expect(validateVerifier(data)).toEqual([]);
});

test('rejects data with fewer than 3 cases', () => {
  expect(validateVerifier({ cases: [mk('a'), mk('b')] }).join()).toMatch(/3/);
});

test('rejects case without exactly one correct option or hot line out of range', () => {
  const bad = mk('x');
  bad.options[1] = { ...bad.options[1], correct: true } as (typeof bad.options)[1];
  expect(validateVerifier({ cases: [bad, mk('b'), mk('c')] }).join()).toMatch(/x/);
  expect(validateVerifier({ cases: [{ ...mk('y'), hot: 9 }, mk('b'), mk('c')] }).join()).toMatch(/y/);
});

test('wrong option keeps case unsolved', () => {
  const r = pickOption(emptyState(), data, 'a', 1);
  expect(r.result).toBe('reject');
  expect(r.state.solved).toEqual([]);
});

test('complete when all cases solved', () => {
  let s = emptyState();
  for (const id of ['a', 'b']) s = pickOption(s, data, id, 0).state;
  expect(isComplete(s, data)).toBe(false);
  const r = pickOption(s, data, 'c', 0);
  expect(r.result).toBe('pass');
  expect(isComplete(r.state, data)).toBe(true);
  expect(pickOption(r.state, data, 'c', 0).state.solved).toEqual(['a', 'b', 'c']);
});

test('quotedLines returns code, fixed, badLog, goodLog and option logs', () => {
  const q = verifierQuoted({ cases: [mk('a')] });
  expect(q).toEqual(expect.arrayContaining(['a\nb\nc', 'a\nfix\nb\nc', 'bad a', 'good a', 'opt a']));
});

test('goodLog is optional (pass evidence may be prose only)', () => {
  const { goodLog: _g, ...noGood } = mk('a');
  expect(validateVerifier({ cases: [noGood as never, mk('b'), mk('c')] })).toEqual([]);
});
