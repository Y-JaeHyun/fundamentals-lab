import type { Course } from '../content/schema';
import type { ProgressStore } from '../progress';
import { h } from './dom';

export function renderMap(el: HTMLElement, courses: Course[], progress: ProgressStore): void {
  el.append(
    h(
      'section',
      { class: 'intro' },
      h('p', { class: 'lede' }, '장 하나 = 세 단계. 5분 만져 보기 → 5분 문제 풀이 → (선택) 내 리눅스에서 진짜로 돌려 보기. 순서는 추천일 뿐, 아무 칸이나 바로 들어가도 돼요.'),
      h(
        'p',
        { class: 'legend' },
        h('span', { class: 'cell-key new' }), '시작 전 ',
        h('span', { class: 'cell-key in-progress' }), '진행 중 ',
        h('span', { class: 'cell-key done' }), '완료',
      ),
    ),
  );
  for (const c of courses) {
    const cells = h('div', { class: 'cells' });
    const statuses = c.chapters.map((ch) => progress.status(c.id, ch));
    c.chapters.forEach((ch, i) => {
      const st = ch.linksOnly ? 'links' : statuses[i];
      cells.append(
        h(
          'a',
          { class: `cell ${st}`, href: `#${c.id}-${ch.id}`, title: ch.summary },
          h('span', { class: 'cid' }, ch.id.toUpperCase()),
          h('span', { class: 'ctitle' }, ch.title),
          ch.sim ? h('span', { class: 'csim' }, '만져 보기 있음') : null,
        ),
      );
    });
    const scored = c.chapters.filter((ch) => !ch.linksOnly);
    const done = scored.filter((ch) => progress.status(c.id, ch) === 'done').length;
    const next = c.chapters.find((ch, i) => !ch.linksOnly && statuses[i] === 'in-progress') ?? c.chapters.find((ch, i) => !ch.linksOnly && statuses[i] === 'new');
    el.append(
      h(
        'section',
        { class: 'track' },
        h('div', { class: 'track-head' }, h('h2', {}, c.title), h('span', { class: 'count' }, `${done} / ${scored.length} 완료`)),
        h('p', { class: 'muted' }, c.summary),
        next ? h('p', {}, h('a', { class: 'btn primary', href: `#${c.id}-${next.id}` }, `이어서 하기: ${next.id.toUpperCase()} ${next.title}`)) : null,
        cells,
      ),
    );
  }
}
