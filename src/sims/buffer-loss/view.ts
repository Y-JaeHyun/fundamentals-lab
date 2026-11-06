import { estimatedBadge, kernelNote, measuredBadge } from '../../ui/badges';
import { h } from '../../ui/dom';
import type { SimView } from '../registry';
import { delayRange, estimateLoss, METHODS, type Buffer, type BufferLossData, type Method } from './model';

const LABEL: Record<Method, string> = { map: '커널 안 집계(map)', 'ringbuf-reserve': 'ring buffer (reserve)', 'ringbuf-output': 'ring buffer (output)', perf: 'perf buffer' };
const BUF_LABEL: Record<Buffer, string> = { default: '기본 버퍼 (perf CPU당 64KB, ring 1MB)', small: '작은 버퍼 (perf CPU당 4KB, ring 64KB)' };

export const bufferLossSim: SimView = {
  kind: 'buffer-loss',
  mount(el, raw, ctx) {
    const data = raw as BufferLossData;
    let buffer: Buffer = 'default';
    let delay = 0;
    const visited = new Set<string>();
    let completed = false;

    const bufBtns = h('div', { class: 'row' });
    const slider = h('input', { type: 'range', id: 'buffer-loss-delay', min: '0', max: '2', step: '0.1', value: '0' });
    const delayOut = h('output', { for: 'buffer-loss-delay' });
    const bars = h('div', { class: 'bars' });
    const status = h('div', { class: 'fb', 'aria-live': 'polite' });
    el.append(
      h('p', { class: 'lede' }, 'read() 50만 번마다 64바이트 이벤트를 사용자 공간으로 보내요. 버퍼 크기와 소비자 속도를 바꿔 가며 몇 개를 잃는지 보세요.'),
      bufBtns,
      h('div', { class: 'row slider-row' }, h('label', { for: 'buffer-loss-delay' }, '소비자 지연 (레코드당)'), slider, delayOut),
      bars,
      status,
    );

    (['default', 'small'] as const).forEach((b) => {
      const btn = h('button', { 'data-buffer': b, 'aria-pressed': 'false' }, BUF_LABEL[b]);
      btn.onclick = () => {
        buffer = b;
        delay = 0;
        slider.value = '0';
        render();
      };
      bufBtns.append(btn);
    });
    slider.oninput = () => {
      delay = Number(slider.value);
      render();
    };

    const render = () => {
      bufBtns.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.buffer === buffer)));
      const range = delayRange(data, buffer);
      slider.disabled = range === null;
      if (range) {
        slider.min = String(range[0]);
        slider.max = String(range[1]);
      }
      delayOut.textContent = range ? `${delay.toFixed(1)}µs` : '0µs (이 버퍼는 지연 0에서만 측정)';
      let measured = true;
      bars.replaceChildren(
        ...METHODS.map((m) => {
          const r = estimateLoss(data, buffer, delay, m);
          measured &&= r.measured;
          const pct = r.total ? (r.lost / r.total) * 100 : 0;
          return h(
            'div',
            { class: 'bar' },
            h('span', { class: 'name' }, LABEL[m]),
            h('span', { class: 'bar-track' }, h('span', { class: 'fill', style: `width:${Math.max(pct, r.lost ? 0.6 : 0).toFixed(2)}%` })),
            h('span', { class: 'num' }, `유실 ${r.lost.toLocaleString('ko-KR')} (${pct < 0.1 && pct > 0 ? pct.toFixed(2) : pct.toFixed(1)}%)`),
          );
        }),
      );
      status.className = 'fb';
      status.replaceChildren(
        h('p', {}, measured ? measuredBadge() : estimatedBadge(), kernelNote()),
        h('p', { class: 'small' }, measured ? '저장소에서 실제로 측정한 값이에요.' : '두 실측점 사이를 직선으로 이은 추정치예요. 실제로 재 본 값이 아니에요.'),
      );
      if (measured) {
        if (buffer === 'small' && delay >= 2) status.append(h('p', {}, '느린 소비자에선 ring buffer가 절반 넘게 잃었어요. perf가 튼튼해서가 아니라, perf 쪽은 이벤트를 만드는 속도가 소비보다 느렸기 때문이에요. 유실은 버퍼 크기보다 생산 속도 대 소비 속도가 정해요.'));
        else if (buffer === 'small') status.append(h('p', {}, '작은 버퍼에선 지연이 없어도 조금씩 잃어요. perf는 bench가 도는 CPU 하나의 4KB만 쓰여서 순간 몰림에 더 약했어요.'));
        visited.add(`${buffer}@${delay}`);
      }
      const all = data.anchors.every((a) => visited.has(`${a.buffer}@${a.delayUs}`));
      if (all && !completed) {
        completed = true;
        status.append(h('p', { class: 'small' }, '실측점을 모두 봤어요. 문제 풀이 탭으로 넘어가 보세요.'));
        ctx.onComplete();
      }
    };
    render();
    return () => {};
  },
};
