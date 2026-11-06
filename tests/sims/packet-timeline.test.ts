import { expect, test, vi } from 'vitest';
import type { Chapter, Course } from '../../src/content/schema';
import { isTimelineComplete, parseRow, timelineQuoted, validateTimeline, type PacketTimelineData } from '../../src/sims/packet-timeline/model';
import { packetTimelineSim } from '../../src/sims/packet-timeline/view';

const ROW_ALL = '1           0      4.9         2.9      1.6      5.3      1.2      3.5    받음';
const ROW_TC = '1           0      5.5           -        -        -        -        -     -';
const data: PacketTimelineData = {
  scenarios: [
    { id: 'none', label: '버리지 않음', row: ROW_ALL, received: '앱이 받은 패킷: 10/10' },
    { id: 'tc', label: 'TC에서 버림', row: ROW_TC, received: '앱이 받은 패킷: 0/10' },
  ],
};

test('parseRow maps columns to stages and finds drop point', () => {
  const all = parseRow(ROW_ALL);
  expect(all.values.TC).toBe(4.9);
  expect(all.values.socket).toBe(3.5);
  expect(all.delivered).toBe(true);
  expect(all.dropAt).toBeNull();
  const tc = parseRow(ROW_TC);
  expect(tc.reached).toEqual(['XDP', 'TC']);
  expect(tc.dropAt).toBe('TC');
  expect(tc.delivered).toBe(false);
});

test('rejects row with wrong column count', () => {
  expect(validateTimeline({ scenarios: [...data.scenarios, { id: 'x', label: 'x', row: '1 0 5.5', received: '앱이 받은 패킷: 0/10' }] }).join()).toMatch(/x/);
});

test('rejects received line inconsistent with row', () => {
  const bad = { scenarios: [data.scenarios[0], { ...data.scenarios[1], received: '앱이 받은 패킷: 10/10' }] };
  expect(validateTimeline(bad).join()).toMatch(/tc/);
});

test('accepts valid data and quotes rows and received lines', () => {
  expect(validateTimeline(data)).toEqual([]);
  expect(timelineQuoted(data)).toEqual([ROW_ALL, '앱이 받은 패킷: 10/10', ROW_TC, '앱이 받은 패킷: 0/10']);
});

test('complete after viewing every scenario', () => {
  expect(isTimelineComplete(new Set(['none']), data)).toBe(false);
  expect(isTimelineComplete(new Set(['none', 'tc']), data)).toBe(true);
});

test('view: playing every scenario completes once and marks dropped stages', () => {
  const el = document.createElement('div');
  const onComplete = vi.fn();
  packetTimelineSim.mount(el, data, { course: {} as Course, chapter: {} as Chapter, onComplete });
  const btns = [...el.querySelectorAll<HTMLButtonElement>('button.scenario')];
  btns[1].click();
  expect(el.querySelector('.stage[data-stage="TC"]')?.classList.contains('drop')).toBe(true);
  expect(el.querySelector('.stage[data-stage="NF_IN"]')?.classList.contains('skipped')).toBe(true);
  btns[0].click();
  btns[0].click();
  expect(onComplete).toHaveBeenCalledTimes(1);
});
