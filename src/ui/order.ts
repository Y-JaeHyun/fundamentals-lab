import { h } from './dom';

function shuffled(items: string[]): string[] {
  if (items.length < 2) return [...items];
  for (;;) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (a.some((x, i) => x !== items[i])) return a;
  }
}

/** items = 정답 순서. 섞어 보여 주고 위/아래 버튼으로 옮긴 뒤 "확인"으로 판정. */
export function renderOrder(el: HTMLElement, items: string[], onSolved: () => void): void {
  const cur = shuffled(items);
  let solved = false;
  const list = h('ol', { class: 'order' });
  const fb = h('div', { class: 'fb', 'aria-live': 'polite' }, '위·아래 버튼으로 순서를 맞춘 뒤 확인을 누르세요.');

  const draw = (focusIdx?: number, dir?: 'up' | 'down') => {
    list.replaceChildren(
      ...cur.map((text, i) => {
        const up = h('button', { class: 'up', 'aria-label': `${text} 위로` }, '↑');
        const down = h('button', { class: 'down', 'aria-label': `${text} 아래로` }, '↓');
        up.disabled = i === 0;
        down.disabled = i === cur.length - 1;
        up.onclick = () => swap(i, i - 1, 'up');
        down.onclick = () => swap(i, i + 1, 'down');
        return h('li', {}, h('span', { class: 'item' }, text), h('span', { class: 'moves' }, up, down));
      }),
    );
    if (focusIdx !== undefined && dir) {
      const btn = list.children[focusIdx]?.querySelector<HTMLButtonElement>(`button.${dir}:not(:disabled)`);
      (btn ?? list.children[focusIdx]?.querySelector<HTMLButtonElement>('button:not(:disabled)'))?.focus();
    }
  };
  const swap = (i: number, j: number, dir: 'up' | 'down') => {
    [cur[i], cur[j]] = [cur[j], cur[i]];
    draw(j, dir);
  };

  const check = h('button', { class: 'check primary' }, '확인');
  check.onclick = () => {
    const wrong = cur.filter((x, i) => x !== items[i]).length;
    if (wrong === 0) {
      fb.className = 'fb good';
      fb.textContent = '정답이에요.';
      if (!solved) {
        solved = true;
        onSolved();
      }
    } else {
      fb.className = 'fb bad';
      fb.textContent = `${wrong}개가 제자리가 아니에요.`;
    }
  };
  draw();
  el.append(list, h('div', { class: 'row' }, check), fb);
}
