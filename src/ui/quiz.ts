import type { Question } from '../content/schema';
import { logBlock } from './badges';
import { h } from './dom';
import { renderOrder } from './order';
import { shuffle } from './shuffle';

export function renderQuestion(el: HTMLElement, q: Question, onCorrect: () => void): void {
  let done = false;
  const correct = () => {
    if (done) return;
    done = true;
    onCorrect();
  };
  const box = h('div', { class: 'question' }, h('p', { class: 'prompt' }, q.prompt));
  el.append(box);

  if (q.kind === 'order') {
    const holder = h('div', {});
    box.append(holder);
    renderOrder(holder, q.items, () => {
      holder.querySelector('.fb')!.textContent = q.feedback;
      correct();
    });
    return;
  }

  if (q.code) box.append(h('pre', { class: 'code' }, q.code));
  if (q.log) box.append(logBlock(q.log));
  const opts = h('div', { class: 'opts' });
  const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
  shuffle(q.options).forEach((o) => {
    const b = h('button', {}, o.text);
    b.onclick = () => {
      opts.querySelectorAll('button.wrong').forEach((x) => x.classList.remove('wrong'));
      fb.replaceChildren(h('p', {}, o.feedback));
      if (o.log) fb.append(h('p', { class: 'kernel-says' }, '커널이 이번엔 이렇게 말해요'), logBlock(o.log));
      if (o.correct) {
        b.classList.add('right');
        fb.className = 'fb good';
        correct();
      } else {
        b.classList.add('wrong');
        fb.className = 'fb bad';
      }
    };
    opts.append(b);
  });
  box.append(opts, fb);
}
