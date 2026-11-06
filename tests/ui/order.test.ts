import { expect, test, vi } from 'vitest';
import { renderOrder } from '../../src/ui/order';

const ANSWER = ['소스', 'clang', 'verifier', 'JIT'];
const current = (el: HTMLElement) => [...el.querySelectorAll('li .item')].map((x) => x.textContent);

function moveTo(el: HTMLElement, target: string[]) {
  // 위로 버튼만으로 target 순서를 만든다 (선택 정렬)
  for (let i = 0; i < target.length; i++) {
    let j = current(el).indexOf(target[i]);
    while (j > i) {
      el.querySelectorAll<HTMLButtonElement>('li')[j].querySelector<HTMLButtonElement>('button.up')!.click();
      j--;
    }
  }
}

test('initial order differs from answer', () => {
  for (let k = 0; k < 20; k++) {
    const el = document.createElement('div');
    renderOrder(el, ANSWER, () => {});
    expect(current(el)).not.toEqual(ANSWER);
  }
});

test('solves when items reordered to answer', () => {
  const el = document.createElement('div');
  const solved = vi.fn();
  renderOrder(el, ANSWER, solved);
  moveTo(el, ANSWER);
  el.querySelector<HTMLButtonElement>('button.check')!.click();
  expect(solved).toHaveBeenCalledTimes(1);
});

test('does not solve on wrong order', () => {
  const el = document.createElement('div');
  const solved = vi.fn();
  renderOrder(el, ANSWER, solved);
  moveTo(el, ['JIT', 'verifier', 'clang', '소스']);
  el.querySelector<HTMLButtonElement>('button.check')!.click();
  expect(solved).not.toHaveBeenCalled();
  expect(el.querySelector('.fb')?.classList.contains('bad')).toBe(true);
});
