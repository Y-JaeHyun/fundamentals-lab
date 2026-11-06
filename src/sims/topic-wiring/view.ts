import { measuredBadge } from '../../ui/badges';
import { h, reducedMotion } from '../../ui/dom';
import type { SimView } from '../registry';
import { allConnected, edgeStatus, type SubscriberDef, type WiringData } from './model';

const short = (type: string) => type.split('/').pop() ?? type;

export const topicWiringSim: SimView = {
  kind: 'topic-wiring',
  mount(el, raw, ctx) {
    const data = raw as WiringData;
    const subs: SubscriberDef[] = data.subscribers.map((s) => ({ ...s }));
    let completed = false;
    let raf = 0;

    const chain = h('div', { class: 'chain' });
    const canvas = h('canvas', { class: 'world', width: '720', height: '240', 'aria-label': '로봇 시뮬레이션' });
    const state = h('p', { class: 'robot-state pill' });
    el.append(
      h('p', { class: 'lede' }, '로봇이 공을 따라가야 하는데 서 있어요. 각 노드의 구독 토픽과 QoS를 고쳐 카메라부터 바퀴까지 메시지가 흐르게 하세요. 버그가 일부러 심어져 있어요.'),
      chain,
      h('div', { class: 'row' }, state),
      canvas,
    );

    const publishers = [...new Set(data.topics.map((t) => t.publisher))];
    const render = () => {
      chain.replaceChildren(
        ...publishers.map((node) => {
          const card = h('div', { class: 'node' }, h('span', { class: 'nm' }, `/${node}`));
          const sub = subs.find((s) => s.node === node);
          if (sub) {
            const topicSel = h('select', { 'data-node': node, 'data-field': 'topic', id: `w-${node}-topic`, 'aria-label': `${node} 구독 토픽` });
            for (const t of data.topics) topicSel.append(h('option', { value: t.name }, `${t.name} (${short(t.type)})`));
            topicSel.value = sub.topic;
            topicSel.onchange = () => {
              sub.topic = topicSel.value;
              render();
            };
            const qosSel = h('select', { 'data-node': node, 'data-field': 'reliability', id: `w-${node}-qos`, 'aria-label': `${node} 구독 QoS` });
            for (const r of ['RELIABLE', 'BEST_EFFORT']) qosSel.append(h('option', { value: r }, r));
            qosSel.value = sub.reliability;
            qosSel.onchange = () => {
              sub.reliability = qosSel.value as SubscriberDef['reliability'];
              render();
            };
            const st = edgeStatus(data, sub);
            const o = data.outcomes[st.kind];
            card.append(
              h('label', { class: 'io', for: topicSel.id }, '구독'),
              topicSel,
              h('span', { class: 'small' }, `기대 타입 ${short(sub.wants)}`),
              h('label', { class: 'io', for: qosSel.id }, '구독 신뢰성(reliability)'),
              qosSel,
              h(
                'div',
                { class: `edge ${st.kind === 'ok' ? 'ok' : 'err'}` },
                h('p', {}, o.text),
                o.measured ? h('div', { class: 'logwrap' }, measuredBadge(), h('pre', { class: 'log' }, o.measured)) : null,
              ),
            );
          }
          for (const t of data.topics.filter((x) => x.publisher === node)) {
            card.append(h('span', { class: 'io' }, '발행'), h('code', {}, `${t.name} · ${short(t.type)} · ${t.reliability}`));
          }
          return card;
        }),
      );
      const ok = allConnected(data, subs);
      state.textContent = ok ? '주행 중 — 모든 연결이 살아 있어요' : '정지 — 끊긴 연결이 있어요';
      state.className = `robot-state pill ${ok ? 'done' : 'in-progress'}`;
      if (ok && !completed) {
        completed = true;
        ctx.onComplete();
      }
      running = ok;
    };

    // 공을 쫓는 로봇(연결이 다 살아 있을 때만 움직임)
    let running = false;
    const R = { x: 60, y: 120, a: 0 };
    let ball = { x: 600, y: 70 };
    const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888';
    const step = () => {
      const cx = canvas.getContext?.('2d');
      if (!cx) return;
      if (running) {
        const dx = ball.x - R.x;
        const dy = ball.y - R.y;
        let da = Math.atan2(dy, dx) - R.a;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        R.a += Math.max(-0.08, Math.min(0.08, da * 0.15));
        const sp = Math.abs(da) < 1 ? 2.5 : 0.8;
        R.x += Math.cos(R.a) * sp;
        R.y += Math.sin(R.a) * sp;
        if (Math.hypot(dx, dy) < 22) ball = { x: 40 + Math.random() * 640, y: 30 + Math.random() * 180 };
      }
      cx.clearRect(0, 0, canvas.width, canvas.height);
      cx.fillStyle = css('--amber');
      cx.beginPath();
      cx.arc(ball.x, ball.y, 10, 0, 7);
      cx.fill();
      cx.save();
      cx.translate(R.x, R.y);
      cx.rotate(R.a);
      cx.fillStyle = css('--ink');
      cx.fillRect(-18, -13, 36, 26);
      cx.fillStyle = css('--accent');
      cx.fillRect(10, -5, 10, 10);
      cx.restore();
      if (!reducedMotion()) raf = requestAnimationFrame(step);
    };
    render();
    if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  },
};
