import { expect, test, vi } from 'vitest';
import type { Chapter, Course } from '../../src/content/schema';
import { verifierSim } from '../../src/sims/verifier/view';

const mk = (id: string) => ({
  id, title: `케이스 ${id}`, code: 'a\nb', hot: 2, fixed: 'a\nfix\nb', badLog: `bad ${id}`, goodLog: `good ${id}`,
  options: [{ text: '오답', feedback: '아니에요' }, { text: '정답', correct: true, feedback: '맞아요' }],
});

test('solving every case shows good log and completes once', () => {
  const el = document.createElement('div');
  const onComplete = vi.fn();
  verifierSim.mount(el, { cases: [mk('a'), mk('b'), mk('c')] }, { course: {} as Course, chapter: {} as Chapter, onComplete });
  expect(el.querySelector('pre.code .hot')?.textContent).toBe('b');
  expect(el.textContent).toContain('bad a');
  for (let i = 0; i < 3; i++) {
    const opts = [...el.querySelectorAll<HTMLButtonElement>('.opts button')];
    const pickText = (t: string) => opts.find((b) => b.textContent === t)!;
    pickText('오답').click();
    expect(el.querySelector('.fb')?.classList.contains('bad')).toBe(true);
    pickText('정답').click();
    expect(el.textContent).toContain(`good ${'abc'[i]}`);
    expect(el.querySelector('pre.code .fix')?.textContent).toBe('fix');
    el.querySelector<HTMLButtonElement>('button.next')?.click();
  }
  expect(onComplete).toHaveBeenCalledTimes(1);
});

test('keyboard focus moves to the next case options after "다음 케이스"', () => {
  const el = document.createElement('div');
  document.body.append(el);
  verifierSim.mount(el, { cases: [mk('a'), mk('b'), mk('c')] }, { course: {} as Course, chapter: {} as Chapter, onComplete: () => {} });
  [...el.querySelectorAll<HTMLButtonElement>('.opts button')].find((b) => b.textContent === '정답')!.click();
  el.querySelector<HTMLButtonElement>('button.next')!.click();
  expect(document.activeElement?.closest('.opts')).not.toBeNull();
  el.querySelectorAll<HTMLButtonElement>('.case-tabs button')[2].click();
  expect(document.activeElement?.closest('.case-tabs, .opts')).not.toBeNull();
  el.remove();
});
