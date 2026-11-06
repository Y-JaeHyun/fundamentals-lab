import { expect, test, vi } from 'vitest';
import type { Chapter, Course } from '../../src/content/schema';
import { emptyPickState, hookQuoted, isPickComplete, pick, validateHookPicker, type HookPickerData } from '../../src/sims/hook-picker/model';
import { hookPickerSim } from '../../src/sims/hook-picker/view';

const data: HookPickerData = {
  missions: [
    {
      id: 'm1', prompt: '즉시 EPERM', hooks: ['cgroup-connect4', 'tc-egress'], answer: 'cgroup-connect4',
      outcomes: { 'cgroup-connect4': { text: '즉시 실패', measured: 'EPERM, 159.4µs' }, 'tc-egress': { text: '타임아웃', measured: '시간 초과, 2.5s' } },
    },
    {
      id: 'm2', prompt: '가장 앞단', hooks: ['xdp', 'tc-ingress'], answer: 'xdp',
      outcomes: { xdp: { text: '앞단' }, 'tc-ingress': { text: 'sk_buff 이후' } },
    },
  ],
};

test('accepts valid data', () => {
  expect(validateHookPicker(data)).toEqual([]);
});

test('validator requires outcome for every offered hook', () => {
  const bad = structuredClone(data);
  delete bad.missions[0].outcomes['tc-egress'];
  expect(validateHookPicker(bad).join()).toMatch(/m1.*tc-egress/);
});

test('validator rejects answer not offered and unknown hook ids', () => {
  const bad = structuredClone(data);
  bad.missions[1].answer = 'netfilter';
  expect(validateHookPicker(bad).join()).toMatch(/m2/);
  const bad2 = structuredClone(data) as unknown as { missions: { hooks: string[] }[] };
  bad2.missions[1].hooks.push('warp-drive');
  expect(validateHookPicker(bad2).join()).toMatch(/warp-drive/);
});

test('pick returns outcome and correctness', () => {
  const r = pick(emptyPickState(), data, 'm1', 'tc-egress');
  expect(r.correct).toBe(false);
  expect(r.outcome.measured).toBe('시간 초과, 2.5s');
  expect(r.state.cleared).toEqual([]);
});

test('complete after each mission answered correctly once', () => {
  let s = pick(emptyPickState(), data, 'm1', 'cgroup-connect4').state;
  expect(isPickComplete(s, data)).toBe(false);
  s = pick(s, data, 'm2', 'xdp').state;
  expect(isPickComplete(s, data)).toBe(true);
});

test('quotedLines lists measured strings', () => {
  expect(hookQuoted(data)).toEqual(['EPERM, 159.4µs', '시간 초과, 2.5s']);
});

test('view: only mission hooks are clickable and completing all missions calls onComplete once', () => {
  const el = document.createElement('div');
  const onComplete = vi.fn();
  hookPickerSim.mount(el, data, { course: {} as Course, chapter: {} as Chapter, onComplete });
  const enabled = () => [...el.querySelectorAll<HTMLButtonElement>('button.hook:not(:disabled)')].map((b) => b.dataset.hook);
  expect(enabled().sort()).toEqual(['cgroup-connect4', 'tc-egress']);
  el.querySelector<HTMLButtonElement>('button.hook[data-hook="tc-egress"]')!.click();
  expect(el.querySelector('.fb')?.textContent).toContain('시간 초과, 2.5s');
  el.querySelector<HTMLButtonElement>('button.hook[data-hook="cgroup-connect4"]')!.click();
  el.querySelector<HTMLButtonElement>('button.next')!.click();
  expect(enabled().sort()).toEqual(['tc-ingress', 'xdp']);
  el.querySelector<HTMLButtonElement>('button.hook[data-hook="xdp"]')!.click();
  expect(onComplete).toHaveBeenCalledTimes(1);
});

test('view: keyboard focus moves to an enabled hook after "다음 미션"', async () => {
  const el = document.createElement('div');
  document.body.append(el);
  hookPickerSim.mount(el, data, { course: {} as Course, chapter: {} as Chapter, onComplete: () => {} });
  el.querySelector<HTMLButtonElement>('button.hook[data-hook="cgroup-connect4"]')!.click();
  await new Promise((r) => setTimeout(r, 800)); // 문서에 붙어 있으면 결과가 0.7초 뒤 표시된다
  el.querySelector<HTMLButtonElement>('button.next')!.click();
  const a = document.activeElement as HTMLButtonElement | null;
  el.remove();
  expect(a?.classList.contains('hook')).toBe(true);
  expect(a?.disabled).toBe(false);
});
