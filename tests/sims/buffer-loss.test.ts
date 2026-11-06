import { expect, test, vi } from 'vitest';
import type { Chapter, Course } from '../../src/content/schema';
import { bufferQuoted, delayRange, estimateLoss, parseAnchor, validateBufferLoss, type BufferLossData } from '../../src/sims/buffer-loss/model';
import { bufferLossSim } from '../../src/sims/buffer-loss/view';

const rows = (rr: number, ro: number, pf: number) =>
  [
    '집계(map)              500000          -          0      967.4      323.3          1ms',
    `ringbuf reserve      500000     ${500000 - rr}     ${rr}     1797.3     1149.2        588ms`,
    `ringbuf output       500000     ${500000 - ro}     ${ro}     1833.8     1239.2        579ms`,
    `perf buffer          500000     ${500000 - pf}     ${pf}     3152.4     2572.1       1.347s`,
  ].join('\n');
const data: BufferLossData = {
  anchors: [
    { buffer: 'default', delayUs: 0, rows: rows(0, 0, 0) },
    { buffer: 'small', delayUs: 0, rows: rows(704, 293, 7603) },
    { buffer: 'small', delayUs: 2, rows: rows(285845, 264763, 1768) },
  ],
};

test('parseAnchor reads lost and total per method', () => {
  const p = parseAnchor(data.anchors[1]);
  expect(p.perf).toEqual({ events: 500000, received: 492397, lost: 7603 });
  expect(p.map.received).toBeNull();
});

test('returns measured at anchors', () => {
  expect(estimateLoss(data, 'small', 2, 'ringbuf-reserve')).toEqual({ lost: 285845, total: 500000, measured: true });
  expect(estimateLoss(data, 'default', 0, 'perf')).toEqual({ lost: 0, total: 500000, measured: true });
});

test('interpolates between small-buffer anchors and flags estimated', () => {
  const r = estimateLoss(data, 'small', 1, 'perf');
  expect(r.measured).toBe(false);
  expect(r.lost).toBe(Math.round((7603 + 1768) / 2));
});

test('clamps outside measured range', () => {
  expect(estimateLoss(data, 'small', 5, 'ringbuf-output')).toEqual({ lost: 264763, total: 500000, measured: true });
});

test('delayRange null for default buffer', () => {
  expect(delayRange(data, 'default')).toBeNull();
  expect(delayRange(data, 'small')).toEqual([0, 2]);
});

test('validator rejects malformed rows and duplicate anchors', () => {
  expect(validateBufferLoss(data)).toEqual([]);
  expect(validateBufferLoss({ anchors: [...data.anchors, { buffer: 'small', delayUs: 0, rows: rows(1, 1, 1) }] }).join()).toMatch(/중복/);
  expect(validateBufferLoss({ anchors: [data.anchors[0], { buffer: 'small', delayUs: 0, rows: 'perf buffer 1 2' }] }).join()).toMatch(/small/);
});

test('quotes rows', () => {
  expect(bufferQuoted(data)).toHaveLength(3);
});

test('view: visiting all measured anchors completes once; estimated badge between anchors', () => {
  const el = document.createElement('div');
  const onComplete = vi.fn();
  bufferLossSim.mount(el, data, { course: {} as Course, chapter: {} as Chapter, onComplete });
  const slider = el.querySelector<HTMLInputElement>('input[type=range]')!;
  expect(slider.disabled).toBe(true);
  el.querySelector<HTMLButtonElement>('button[data-buffer="small"]')!.click();
  expect(slider.disabled).toBe(false);
  slider.value = '1';
  slider.dispatchEvent(new Event('input'));
  expect(el.querySelector('.badge.estimated')).not.toBeNull();
  slider.value = '2';
  slider.dispatchEvent(new Event('input'));
  expect(el.querySelector('.badge.measured')).not.toBeNull();
  expect(onComplete).toHaveBeenCalledTimes(1);
});
