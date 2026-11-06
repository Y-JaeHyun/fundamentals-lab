import { kernelNote, measuredBadge } from '../../ui/badges';
import { h, reducedMotion } from '../../ui/dom';
import type { SimView } from '../registry';
import { isTimelineComplete, parseRow, STAGES, type PacketTimelineData } from './model';

const STAGE_LABEL: Record<(typeof STAGES)[number], string> = {
  XDP: 'XDP', TC: 'TC ingress', ip_rcv_core: 'IP 진입', NF_PRE: 'NF PRE_ROUTING', NF_IN: 'NF LOCAL_IN', udp_rcv: 'udp_rcv', socket: '소켓 필터', app: '앱',
};

export const packetTimelineSim: SimView = {
  kind: 'packet-timeline',
  mount(el, raw, ctx) {
    const data = raw as PacketTimelineData;
    const viewed = new Set<string>();
    let completed = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const clear = () => timers.splice(0).forEach(clearTimeout);

    const buttons = h('div', { class: 'row' });
    const track = h('div', { class: 'timeline' });
    const summary = h('div', { class: 'fb', 'aria-live': 'polite' });
    el.append(
      h('p', { class: 'lede' }, '같은 UDP 패킷 10개를 보내고, 어디서 버리느냐에 따라 어느 hook까지 오는지 비교해요. 칸의 숫자는 앞 단계를 지난 뒤 걸린 시간(µs)이에요.'),
      buttons,
      track,
      summary,
    );

    const play = (i: number) => {
      clear();
      const s = data.scenarios[i];
      const p = parseRow(s.row);
      buttons.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
      const cells = STAGES.map((st) => {
        const v = st === 'app' ? (p.delivered ? '받음' : '-') : p.values[st] === null ? '-' : st === 'XDP' && p.values[st] === 0 ? '시작(0)' : `+${p.values[st]}µs`;
        return h('div', { class: 'stage', 'data-stage': st }, h('b', {}, STAGE_LABEL[st]), h('span', { class: 'v' }, v));
      });
      track.replaceChildren(h('div', { class: 'stages-row' }, ...cells));
      const mark = (k: number) => {
        const st = STAGES[k];
        const reached = p.reached.includes(st);
        cells[k].classList.add(reached ? (st === p.dropAt ? 'drop' : 'pass') : 'skipped');
      };
      const total = p.reached.reduce((a, st) => a + (st === 'app' ? 0 : (p.values[st] ?? 0)), 0);
      const finish = () => {
        summary.className = `fb ${p.delivered ? 'good' : 'bad'}`;
        summary.replaceChildren(
          h('p', {}, p.delivered ? `앱까지 도착. 지나간 hook ${p.reached.length - 1}곳, 1번 패킷 기준 합계 약 ${total.toFixed(1)}µs.` : `${STAGE_LABEL[p.dropAt!]}에서 버려져 그 뒤 hook에는 나타나지 않았어요.`),
          h('div', { class: 'logwrap' }, h('span', {}, measuredBadge(), kernelNote()), h('pre', { class: 'log' }, `seq       XDP       TC ip_rcv_core   NF_PRE    NF_IN  udp_rcv   socket   app\n${s.row}\n${s.received}`)),
          h('p', { class: 'small' }, '숫자에는 각 hook에 붙인 실험 프로그램 자신의 비용도 들어 있어요. 순서와 대략의 규모만 보세요.'),
        );
        viewed.add(s.id);
        if (!completed && isTimelineComplete(viewed, data)) {
          completed = true;
          summary.append(h('p', { class: 'small' }, '모든 시나리오를 봤어요. 문제 풀이 탭으로 넘어가 보세요.'));
          ctx.onComplete();
        }
      };
      if (reducedMotion() || !document.body.contains(el)) {
        STAGES.forEach((_, k) => mark(k));
        finish();
      } else {
        summary.className = 'fb';
        summary.replaceChildren(h('p', {}, '패킷 이동 중…'));
        STAGES.forEach((_, k) => timers.push(setTimeout(() => mark(k), 180 * k)));
        timers.push(setTimeout(finish, 180 * STAGES.length));
      }
    };

    data.scenarios.forEach((s, i) => {
      const b = h('button', { class: 'scenario', 'aria-pressed': 'false' }, s.label);
      b.onclick = () => play(i);
      buttons.append(b);
    });
    play(0);
    return clear;
  },
};
