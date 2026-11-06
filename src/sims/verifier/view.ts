import { logBlock } from '../../ui/badges';
import { h } from '../../ui/dom';
import { shuffle } from '../../ui/shuffle';
import type { SimView } from '../registry';
import { emptyState, isComplete, pickOption, type VerifierCase, type VerifierData } from './model';

const STAGES = ['clang 빌드', 'verifier', 'JIT', 'attach'];

function codeBlock(text: string, mark: (line: string, i: number) => string | undefined): HTMLElement {
  const pre = h('pre', { class: 'code lines' });
  text.split('\n').forEach((line, i) => pre.append(h('span', { class: mark(line, i) ? `ln ${mark(line, i)}` : 'ln' }, line || ' ')));
  return pre;
}

export const verifierSim: SimView = {
  kind: 'verifier',
  mount(el, raw, ctx) {
    const data = raw as VerifierData;
    let state = emptyState();
    let idx = 0;
    let completed = false;
    const tabs = h('div', { class: 'row case-tabs' });
    const body = h('div', { class: 'verifier' });
    el.append(h('p', { class: 'lede' }, '커널이 내 프로그램을 거부했어요. 로그를 읽고 고칠 방법을 고르세요.'), tabs, body);

    const stageRow = (lit: number, failAt?: number) =>
      h('div', { class: 'stages' }, ...STAGES.map((s, i) => h('span', { class: i < lit ? 'on' : i === failAt ? 'fail' : '' }, s)));

    const drawTabs = () => {
      tabs.replaceChildren(
        ...data.cases.map((c, i) => {
          const b = h('button', { class: i === idx ? 'case current' : 'case', 'aria-pressed': String(i === idx) }, `${state.solved.includes(c.id) ? '✓ ' : ''}${i + 1}. ${c.title}`);
          b.onclick = () => show(i, 'tab');
          return b;
        }),
      );
    };

    const show = (i: number, focus?: 'options' | 'tab') => {
      idx = i;
      const c: VerifierCase = data.cases[i];
      drawTabs();
      const codeWrap = h('div', {}, codeBlock(c.code, (_l, n) => (n === c.hot - 1 ? 'hot' : undefined)));
      const logWrap = h('div', {}, h('p', { class: 'kernel-says' }, 'verifier 로그'), logBlock(c.badLog));
      const stages = h('div', {}, stageRow(1, 1));
      const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
      const opts = h('div', { class: 'opts' });
      shuffle(c.options.map((o, oi) => [o, oi] as const)).forEach(([o, oi]) => {
        const b = h('button', {}, o.text);
        b.onclick = () => {
          const r = pickOption(state, data, c.id, oi);
          state = r.state;
          opts.querySelectorAll('button.wrong').forEach((x) => x.classList.remove('wrong'));
          fb.replaceChildren(h('p', {}, o.feedback));
          if (r.result === 'pass') {
            b.classList.add('right');
            fb.className = 'fb good';
            const before = new Set(c.code.split('\n').map((l) => l.trim()));
            codeWrap.replaceChildren(codeBlock(c.fixed, (l) => (before.has(l.trim()) ? undefined : 'fix')));
            logWrap.replaceChildren(h('p', { class: 'kernel-says ok' }, 'verifier 통과'), c.goodLog ? logBlock(c.goodLog) : h('p', { class: 'small' }, '고친 버전은 저장소 실습에서 로드에 성공해요.'));
            stages.replaceChildren(stageRow(STAGES.length));
            drawTabs();
            if (i + 1 < data.cases.length) {
              const next = h('button', { class: 'next primary' }, '다음 케이스 →');
              next.onclick = () => show(i + 1, 'options');
              fb.append(h('div', { class: 'row' }, next));
            }
            if (!completed && isComplete(state, data)) {
              completed = true;
              fb.append(h('p', { class: 'small' }, '모든 케이스를 통과시켰어요. 문제 풀이 탭으로 넘어가 보세요.'));
              ctx.onComplete();
            }
          } else {
            b.classList.add('wrong');
            fb.className = 'fb bad';
            if (o.log) fb.append(h('p', { class: 'kernel-says' }, '커널이 이번엔 이렇게 말해요'), logBlock(o.log));
          }
        };
        opts.append(b);
      });
      body.replaceChildren(
        h('div', { class: 'grid2' }, h('div', { class: 'stack' }, codeWrap, logWrap), h('div', { class: 'stack' }, h('h3', {}, c.title), opts, fb, stages)),
      );
      // 다시 그리면 누르던 버튼이 사라지므로 키보드 포커스를 이어 준다
      if (focus === 'tab') tabs.querySelectorAll<HTMLButtonElement>('button')[i]?.focus();
      else if (focus === 'options') opts.querySelector<HTMLButtonElement>('button')?.focus();
    };
    show(0);
    return () => {};
  },
};
