import { expect, test, vi } from 'vitest';
import type { Chapter, Course } from '../../src/content/schema';
import { allConnected, edgeStatus, validateWiring, wiringQuoted, type WiringData } from '../../src/sims/topic-wiring/model';
import { topicWiringSim } from '../../src/sims/topic-wiring/view';

const data: WiringData = {
  topics: [
    { name: '/image_raw', type: 'sensor_msgs/msg/Image', publisher: 'camera', reliability: 'BEST_EFFORT' },
    { name: '/target', type: 'geometry_msgs/msg/Point', publisher: 'detector', reliability: 'RELIABLE' },
    { name: '/cmd_vel', type: 'geometry_msgs/msg/Twist', publisher: 'planner', reliability: 'RELIABLE' },
    { name: '/odom', type: 'nav_msgs/msg/Odometry', publisher: 'base', reliability: 'RELIABLE' },
  ],
  subscribers: [
    { node: 'detector', wants: 'sensor_msgs/msg/Image', topic: '/image_raw', reliability: 'RELIABLE' },
    { node: 'planner', wants: 'geometry_msgs/msg/Point', topic: '/odom', reliability: 'RELIABLE' },
    { node: 'base', wants: 'geometry_msgs/msg/Twist', topic: '/cmd_vel', reliability: 'RELIABLE' },
  ],
  outcomes: {
    'type-mismatch': { text: '타입이 다르면 받지 못해요', measured: 'received 0' },
    'qos-incompatible': { text: '경고가 떠요', measured: '[WARN] incompatible QoS' },
    ok: { text: '받아요', measured: 'received 10' },
  },
};

test('detects qos incompatibility: BEST_EFFORT publisher, RELIABLE subscriber', () => {
  expect(edgeStatus(data, data.subscribers[0]).kind).toBe('qos-incompatible');
  expect(edgeStatus(data, { ...data.subscribers[0], reliability: 'BEST_EFFORT' }).kind).toBe('ok');
});

test('RELIABLE publisher is compatible with both subscriber settings', () => {
  const s = data.subscribers[2];
  expect(edgeStatus(data, s).kind).toBe('ok');
  expect(edgeStatus(data, { ...s, reliability: 'BEST_EFFORT' }).kind).toBe('ok');
});

test('detects type mismatch before qos', () => {
  expect(edgeStatus(data, data.subscribers[1]).kind).toBe('type-mismatch');
});

test('allConnected only when every subscriber is ok', () => {
  expect(allConnected(data, data.subscribers)).toBe(false);
  const fixed = [
    { ...data.subscribers[0], reliability: 'BEST_EFFORT' as const },
    { ...data.subscribers[1], topic: '/target' },
    data.subscribers[2],
  ];
  expect(allConnected(data, fixed)).toBe(true);
});

test('validator requires outcomes for all three kinds and known topics', () => {
  expect(validateWiring(data)).toEqual([]);
  const bad = structuredClone(data) as unknown as { outcomes: Record<string, unknown>; subscribers: { topic: string }[] };
  delete bad.outcomes.ok;
  bad.subscribers[0].topic = '/nope';
  const errs = validateWiring(bad).join('\n');
  expect(errs).toMatch(/ok/);
  expect(errs).toMatch(/\/nope/);
});

test('quotes measured strings', () => {
  expect(wiringQuoted(data).sort()).toEqual(['[WARN] incompatible QoS', 'received 0', 'received 10']);
});

test('view: fixing both bugs completes once and shows measured lines on broken edges', () => {
  const el = document.createElement('div');
  const onComplete = vi.fn();
  topicWiringSim.mount(el, data, { course: {} as Course, chapter: {} as Chapter, onComplete });
  expect(el.textContent).toContain('[WARN] incompatible QoS');
  expect(el.textContent).toContain('received 0');
  const qos = el.querySelector<HTMLSelectElement>('select[data-node="detector"][data-field="reliability"]')!;
  qos.value = 'BEST_EFFORT';
  qos.dispatchEvent(new Event('change'));
  const topic = el.querySelector<HTMLSelectElement>('select[data-node="planner"][data-field="topic"]')!;
  topic.value = '/target';
  topic.dispatchEvent(new Event('change'));
  expect(onComplete).toHaveBeenCalledTimes(1);
  expect(el.querySelector('.robot-state')?.textContent).toContain('주행');
});
