import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import type { Chapter, Course } from '../../src/content/schema';
import { createProgressStore } from '../../src/progress';
import { renderChapter } from '../../src/ui/chapter-view';
import { renderMap } from '../../src/ui/map-view';
import { chapter, course } from '../content/helpers';

const SHA = 'a'.repeat(40);
const ch = chapter('05', {
  slug: '05-verifier',
  run: { cmd: 'make -C chapters/05-verifier/code run', expect: 'ok', sources: [{ path: 'x' }] },
}) as unknown as Chapter;
const c = course([chapter('00'), ch]) as unknown as Course;
const store = () => createProgressStore(null);

test('hides sim tab when chapter has no sim', () => {
  const el = document.createElement('div');
  renderChapter(el, c, ch, store());
  const tabs = [...el.querySelectorAll<HTMLButtonElement>('[role=tab]')];
  expect(tabs.map((t) => t.textContent)).toEqual(['문제 풀이', '진짜로 돌려 보기']);
  expect(tabs[0].getAttribute('aria-selected')).toBe('true');
});

test('shows sim tab first when chapter has sim', () => {
  const el = document.createElement('div');
  const withSim = { ...ch, sim: { kind: 'order', data: { prompt: '순서', items: ['a', 'b', 'c'] }, sources: [{ path: 'x' }] } } as Chapter;
  renderChapter(el, c, withSim, store());
  expect(el.querySelector('[role=tab]')?.textContent).toBe('만져 보기');
  expect(el.querySelector('.order')).not.toBeNull();
});

test('marks progress when quiz answered', () => {
  const el = document.createElement('div');
  const s = store();
  renderChapter(el, c, ch, s);
  el.querySelector<HTMLButtonElement>('.question .opts button')!.click(); // helpers: 첫 보기가 정답
  expect(s.get('ebpf', '05').answers.q1).toBe(true);
});

test('run tab links to pinned sha', () => {
  const el = document.createElement('div');
  renderChapter(el, c, ch, store());
  [...el.querySelectorAll<HTMLButtonElement>('[role=tab]')].find((t) => t.textContent === '진짜로 돌려 보기')!.click();
  const links = [...el.querySelectorAll<HTMLAnchorElement>('a')].map((a) => a.href);
  expect(links).toContain(`https://github.com/x/y/tree/${SHA}/chapters/05-verifier`);
  expect(el.textContent).toContain('make -C chapters/05-verifier/code run');
});

test('renders one cell per chapter with status class', () => {
  const el = document.createElement('div');
  const s = store();
  s.markCorrect('ebpf', '05', 'q1');
  renderMap(el, [c], s);
  const cells = [...el.querySelectorAll<HTMLAnchorElement>('a.cell')];
  expect(cells).toHaveLength(2);
  expect(cells[0].classList.contains('new')).toBe(true);
  expect(cells[1].classList.contains('in-progress')).toBe(true);
});

test('cell href is chapter hash', () => {
  const el = document.createElement('div');
  renderMap(el, [c], store());
  expect(el.querySelector<HTMLAnchorElement>('a.cell')!.getAttribute('href')).toBe('#ebpf-00');
});

test('wide blocks scroll inside container', () => {
  const css = readFileSync(join(import.meta.dirname, '../../src/ui/theme.css'), 'utf8').replace(/\s+/g, ' ');
  for (const sel of ['pre', '.lanes', '.timeline']) {
    const re = new RegExp(`(^|[},])\\s*[^{}]*${sel.replace('.', '\\.')}[^{}]*\\{[^}]*overflow-x:\\s*auto`);
    expect(css, sel).toMatch(re);
  }
});
