import type { Chapter, Course } from '../content/schema';
import type { ProgressStore, Status } from '../progress';
import { getSim } from '../sims/registry';
import { logBlock, sourceList } from './badges';
import { h } from './dom';
import { renderQuestion } from './quiz';

const STATUS_LABEL: Record<Status, string> = { new: '시작 전', 'in-progress': '진행 중', done: '완료' };

export function statusPill(status: Status): HTMLElement {
  return h('span', { class: `pill ${status}` }, STATUS_LABEL[status]);
}

function copyButton(text: string, target: HTMLElement): HTMLElement {
  const b = h('button', { class: 'copy' }, '복사');
  b.onclick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      b.textContent = '복사됨';
    } catch {
      const r = document.createRange();
      r.selectNodeContents(target);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
      b.textContent = '선택됨 — Ctrl+C';
    }
  };
  return b;
}

function runPanel(course: Course, ch: Chapter): HTMLElement {
  const p = h('div', { class: 'stack' });
  const readme = `${course.repo}/tree/${course.sha}/chapters/${ch.slug}`;
  p.append(h('p', { class: 'lede' }, ch.linksOnly ? '이 장은 다음에 읽고 기여할 곳을 모은 읽을거리예요. 본문의 링크 지도를 따라가 보세요.' : '같은 상황을 내 리눅스에서 직접 재현해 봐요. 환경 준비는 저장소 00장을 따라요.'));
  if (ch.run) {
    const pre = h('pre', { class: 'code cmd' }, ch.run.cmd);
    p.append(h('div', { class: 'cmdrow' }, pre, copyButton(ch.run.cmd, pre)));
    if (ch.run.expect) p.append(h('p', { class: 'small' }, '이런 출력이 나오면 성공이에요.'), logBlock(ch.run.expect));
    p.append(sourceList(course, ch.run.sources));
  }
  p.append(h('p', {}, h('a', { href: readme, target: '_blank', rel: 'noopener', class: 'btn' }, `${ch.slug} 장 본문 열기 ↗`)));
  return p;
}

/** 장 화면. 반환값 = 정리 함수 */
export function renderChapter(el: HTMLElement, course: Course, ch: Chapter, progress: ProgressStore): () => void {
  const cleanups: (() => void)[] = [];
  const pill = h('span', {});
  const refreshPill = () => pill.replaceChildren(...(ch.linksOnly ? [] : [statusPill(progress.status(course.id, ch))]));
  refreshPill();

  el.append(
    h(
      'header',
      { class: 'chapter-head' },
      h('a', { href: '#map', class: 'back' }, '← 코스 지도'),
      h('p', { class: 'tag' }, `${course.title} · ${ch.id.toUpperCase()}장`),
      h('h2', {}, ch.title),
      h('p', { class: 'lede' }, ch.summary),
      pill,
    ),
  );

  const stages: { id: string; label: string; build: () => HTMLElement }[] = [];
  const sim = ch.sim;
  const view = sim ? getSim(sim.kind) : undefined;
  if (sim && view && !ch.linksOnly) {
    stages.push({
      id: 'sim',
      label: '만져 보기',
      build: () => {
        const p = h('div', { class: 'stack' });
        const body = h('div', {});
        p.append(body, sourceList(course, sim.sources));
        cleanups.push(
          view.mount(body, sim.data, {
            course,
            chapter: ch,
            onComplete: () => {
              progress.markSim(course.id, ch.id);
              refreshPill();
            },
          }),
        );
        return p;
      },
    });
  }
  if (!ch.linksOnly) {
    stages.push({
      id: 'quiz',
      label: '문제 풀이',
      build: () => {
        const p = h('div', { class: 'stack' });
        const answered = progress.get(course.id, ch.id).answers;
        ch.questions.forEach((q, i) => {
          const card = h('section', { class: 'qcard' }, h('p', { class: 'tag' }, `문제 ${i + 1} / ${ch.questions.length}`, answered[q.id] ? ' · ✓ 맞힌 문제' : ''));
          renderQuestion(card, q, () => {
            progress.markCorrect(course.id, ch.id, q.id);
            refreshPill();
          });
          card.append(sourceList(course, q.sources));
          p.append(card);
        });
        return p;
      },
    });
  }
  stages.push({ id: 'run', label: '진짜로 돌려 보기', build: () => runPanel(course, ch) });

  const tablist = h('div', { class: 'tabs', role: 'tablist', 'aria-label': '단계' });
  const panels: HTMLElement[] = [];
  const tabs: HTMLButtonElement[] = [];
  stages.forEach((s, i) => {
    const tab = h('button', { role: 'tab', id: `tab-${s.id}`, 'aria-controls': `panel-${s.id}` }, s.label);
    const panel = h('div', { role: 'tabpanel', id: `panel-${s.id}`, 'aria-labelledby': `tab-${s.id}`, class: 'panel' });
    let built = false;
    const select = () => {
      tabs.forEach((t, j) => {
        t.setAttribute('aria-selected', String(i === j));
        t.tabIndex = i === j ? 0 : -1;
        panels[j].hidden = i !== j;
      });
      if (!built) {
        panel.append(s.build());
        built = true;
      }
    };
    tab.onclick = select;
    tab.onkeydown = (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.click();
      next.focus();
    };
    tabs.push(tab);
    panels.push(panel);
    tablist.append(tab);
  });
  el.append(tablist, ...panels);
  tabs[0]?.click();
  return () => cleanups.forEach((f) => f());
}
