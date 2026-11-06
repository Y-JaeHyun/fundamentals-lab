import { expect, test, vi } from 'vitest';
import type { Question } from '../../src/content/schema';
import { renderQuestion } from '../../src/ui/quiz';

const q: Question = {
  id: 'q1',
  kind: 'choice',
  prompt: '왜 거부됐을까?',
  log: 'R0 invalid mem access',
  options: [
    { text: 'NULL 검사 추가', correct: true, feedback: '맞아요' },
    { text: 'volatile', feedback: '여전히 거부', log: "R0 invalid mem access 'map_value_or_null'" },
  ],
  sources: [{ path: 'x' }],
};

function setup() {
  const el = document.createElement('div');
  const onCorrect = vi.fn();
  renderQuestion(el, q, onCorrect);
  const buttons = [...el.querySelectorAll<HTMLButtonElement>('.opts button')];
  return { el, onCorrect, buttons };
}

test('correct option calls onCorrect once and shows feedback', () => {
  const { el, onCorrect, buttons } = setup();
  buttons[0].click();
  buttons[0].click();
  expect(onCorrect).toHaveBeenCalledTimes(1);
  expect(el.querySelector('.fb')?.textContent).toContain('맞아요');
  expect(buttons[0].classList.contains('right')).toBe(true);
});

test('wrong option shows feedback and log with measured badge', () => {
  const { el, onCorrect, buttons } = setup();
  buttons[1].click();
  expect(onCorrect).not.toHaveBeenCalled();
  expect(buttons[1].classList.contains('wrong')).toBe(true);
  const fb = el.querySelector('.fb')!;
  expect(fb.textContent).toContain('여전히 거부');
  expect(fb.querySelector('pre.log')?.textContent).toContain('map_value_or_null');
  expect(fb.querySelector('.badge.measured')).not.toBeNull();
});

test('options are buttons reachable by keyboard', () => {
  const { buttons } = setup();
  expect(buttons).toHaveLength(2);
  for (const b of buttons) expect(b.tagName).toBe('BUTTON');
});

test('shows question log as measured', () => {
  const { el } = setup();
  expect(el.querySelector('pre.log')?.textContent).toBe('R0 invalid mem access');
});
