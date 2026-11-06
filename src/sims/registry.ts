import type { Chapter, Course, SimKind } from '../content/schema';
import { bufferLossSim } from './buffer-loss/view';
import { hookPickerSim } from './hook-picker/view';
import { orderSim } from './order/view';
import { packetTimelineSim } from './packet-timeline/view';
import { verifierSim } from './verifier/view';

export interface SimContext {
  course: Course;
  chapter: Chapter;
  /** 시뮬레이션 완료 조건을 처음 만족했을 때 호출 */
  onComplete(): void;
}

export interface SimView {
  kind: SimKind;
  /** 반환값 = 정리 함수 (타이머·애니메이션 해제) */
  mount(el: HTMLElement, data: unknown, ctx: SimContext): () => void;
}

const views: Partial<Record<SimKind, SimView>> = {
  order: orderSim,
  verifier: verifierSim,
  'hook-picker': hookPickerSim,
  'packet-timeline': packetTimelineSim,
  'buffer-loss': bufferLossSim,
};

export function getSim(kind: SimKind): SimView | undefined {
  return views[kind];
}
