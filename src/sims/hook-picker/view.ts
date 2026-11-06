import { measuredBadge } from '../../ui/badges';
import { h, reducedMotion } from '../../ui/dom';
import type { SimView } from '../registry';
import { emptyPickState, HOOKS, isPickComplete, LANE_ORDER, pick, type HookId, type HookPickerData } from './model';

const LANE_LABEL = { in: '수신', out: '송신' } as const;

export const hookPickerSim: SimView = {
  kind: 'hook-picker',
  mount(el, raw, ctx) {
    const data = raw as HookPickerData;
    let state = emptyPickState();
    let idx = 0;
    let completed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const no = h('span', { class: 'tag' });
    const prompt = h('p', { class: 'q' });
    const lanes = h('div', { class: 'lanes' });
    const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
    el.append(
      h('p', { class: 'lede' }, '미션을 읽고 잡을 자리를 고르세요. 패킷(또는 시스템 콜)이 그 지점까지 가서 무슨 일이 생기는지 보여 줘요.'),
      h('div', { class: 'mission' }, no, prompt),
      lanes,
      fb,
    );

    const buttons = new Map<HookId, HTMLButtonElement>();
    const dots: Record<'in' | 'out', HTMLElement> = { in: h('span', { class: 'pkt' }), out: h('span', { class: 'pkt' }) };
    for (const lane of ['in', 'out'] as const) {
      const row = h('div', { class: 'lane' });
      for (const id of LANE_ORDER[lane]) {
        const meta = HOOKS[id];
        const b = h('button', { class: 'hook', 'data-hook': id }, h('b', {}, meta.label), h('small', {}, meta.note));
        b.onclick = () => choose(id);
        buttons.set(id, b);
        row.append(b);
      }
      row.append(dots[lane]);
      lanes.append(h('div', { class: 'lane-wrap' }, h('span', { class: 'lbl' }, LANE_LABEL[lane]), row));
    }

    const moveDot = (target: HookId | null) => {
      for (const lane of ['in', 'out'] as const) {
        const d = dots[lane];
        const first = buttons.get(LANE_ORDER[lane][0])!;
        const t = target && HOOKS[target].lane === lane ? buttons.get(target)! : first;
        d.hidden = !(target === null ? lane === HOOKS[data.missions[idx].answer].lane : HOOKS[target].lane === lane);
        d.style.left = `${t.offsetLeft + t.offsetWidth / 2 - 7}px`;
      }
    };

    const choose = (id: HookId) => {
      const m = data.missions[idx];
      const r = pick(state, data, m.id, id);
      state = r.state;
      buttons.forEach((b) => b.classList.remove('right', 'wrong'));
      moveDot(id);
      requestAnimationFrame(() => moveDot(id));
      const show = () => {
        buttons.get(id)!.classList.add(r.correct ? 'right' : 'wrong');
        fb.className = `fb ${r.correct ? 'good' : 'bad'}`;
        fb.replaceChildren(h('p', {}, r.outcome.text));
        if (r.outcome.measured) fb.append(h('div', { class: 'logwrap' }, measuredBadge(), h('pre', { class: 'log' }, r.outcome.measured)));
        if (r.correct && idx + 1 < data.missions.length) {
          const next = h('button', { class: 'next primary' }, '다음 미션 →');
          next.onclick = () => showMission(idx + 1);
          fb.append(h('div', { class: 'row' }, next));
        }
        if (r.correct && !completed && isPickComplete(state, data)) {
          completed = true;
          fb.append(h('p', { class: 'small' }, '모든 미션을 깼어요. 문제 풀이 탭으로 넘어가 보세요.'));
          ctx.onComplete();
        }
      };
      clearTimeout(timer);
      if (reducedMotion() || typeof window === 'undefined' || !document.body.contains(el)) show();
      else timer = setTimeout(show, 700);
    };

    const showMission = (i: number) => {
      idx = i;
      const m = data.missions[i];
      no.textContent = `미션 ${i + 1} / ${data.missions.length}`;
      prompt.textContent = m.prompt;
      fb.className = 'fb';
      fb.replaceChildren(h('p', {}, '자리를 클릭하세요.'));
      buttons.forEach((b, id) => {
        b.classList.remove('right', 'wrong');
        b.disabled = !m.hooks.includes(id);
      });
      moveDot(null);
      requestAnimationFrame(() => moveDot(null));
    };
    showMission(0);
    return () => clearTimeout(timer);
  },
};
