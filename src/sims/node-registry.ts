// 시뮬레이션 모듈의 순수 로직(검증·인용 줄)만 모은 곳. DOM 없이 Node(출처 검사 CLI)에서도 import 가능해야 한다.
import type { SimKind, SimValidators } from '../content/schema';
import { bufferQuoted, validateBufferLoss } from './buffer-loss/model';
import { hookQuoted, validateHookPicker } from './hook-picker/model';
import { orderQuoted, validateOrderSim } from './order/model';
import { timelineQuoted, validateTimeline } from './packet-timeline/model';
import { validateWiring, wiringQuoted } from './topic-wiring/model';
import { validateVerifier, verifierQuoted } from './verifier/model';

interface SimLogic {
  validate(data: unknown): string[];
  quotedLines(data: unknown): string[];
}

const logic: Partial<Record<SimKind, SimLogic>> = {
  order: { validate: validateOrderSim, quotedLines: orderQuoted },
  verifier: { validate: validateVerifier, quotedLines: verifierQuoted },
  'hook-picker': { validate: validateHookPicker, quotedLines: hookQuoted },
  'packet-timeline': { validate: validateTimeline, quotedLines: timelineQuoted },
  'buffer-loss': { validate: validateBufferLoss, quotedLines: bufferQuoted },
  'topic-wiring': { validate: validateWiring, quotedLines: wiringQuoted },
};

export function simValidators(): SimValidators {
  return Object.fromEntries(Object.entries(logic).map(([k, l]) => [k, l!.validate])) as SimValidators;
}

export function simQuoted(kind: SimKind, data: unknown): string[] {
  return logic[kind]?.quotedLines(data) ?? [];
}
