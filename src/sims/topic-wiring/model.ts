// ROS2 토픽 배선(로봇 코스 09·10장): 구독 토픽과 QoS를 고쳐 카메라→바퀴까지 메시지가 흐르게 한다.
// 판정 규칙은 코스 저장소 09·10장의 실측(타입 불일치 시 수신 0, BEST_EFFORT 발행 + RELIABLE 구독은 비호환)을 따른다.
// 화면에 보이는 measured 문자열은 그 README 실행 결과 줄 그대로(출처 검사 대상).

export type Reliability = 'RELIABLE' | 'BEST_EFFORT';
export type EdgeKind = 'ok' | 'type-mismatch' | 'qos-incompatible';

export interface TopicDef {
  name: string;
  type: string;
  publisher: string;
  reliability: Reliability;
}

export interface SubscriberDef {
  node: string;
  /** 이 노드가 기대하는 메시지 타입 */
  wants: string;
  /** 시작 상태(일부러 틀리게 둔 배선) */
  topic: string;
  reliability: Reliability;
}

export interface Outcome {
  text: string;
  measured?: string;
}

export interface WiringData {
  topics: TopicDef[];
  subscribers: SubscriberDef[];
  outcomes: Record<EdgeKind, Outcome>;
}

const KINDS: EdgeKind[] = ['ok', 'type-mismatch', 'qos-incompatible'];

export function edgeStatus(d: WiringData, s: SubscriberDef): { kind: EdgeKind; topic?: TopicDef } {
  const t = d.topics.find((x) => x.name === s.topic);
  if (!t || t.type !== s.wants) return { kind: 'type-mismatch', topic: t };
  if (t.reliability === 'BEST_EFFORT' && s.reliability === 'RELIABLE') return { kind: 'qos-incompatible', topic: t };
  return { kind: 'ok', topic: t };
}

export function allConnected(d: WiringData, subs: SubscriberDef[]): boolean {
  return subs.every((s) => edgeStatus(d, s).kind === 'ok');
}

export function validateWiring(raw: unknown): string[] {
  const d = raw as Partial<WiringData> | null;
  const errs: string[] = [];
  if (!d || !Array.isArray(d.topics) || d.topics.length < 2) return ['topic-wiring: 토픽은 2개 이상'];
  if (!Array.isArray(d.subscribers) || d.subscribers.length < 1) errs.push('topic-wiring: 구독 노드가 필요');
  const names = new Set(d.topics.map((t) => t.name));
  for (const s of d.subscribers ?? []) {
    if (!names.has(s.topic)) errs.push(`topic-wiring/${s.node}: 알 수 없는 토픽 ${s.topic}`);
    if (!d.topics.some((t) => t.type === s.wants)) errs.push(`topic-wiring/${s.node}: 기대 타입 ${s.wants}를 발행하는 토픽이 없어 풀 수 없음`);
  }
  for (const k of KINDS) if (!d.outcomes?.[k]?.text) errs.push(`topic-wiring: outcomes.${k} 누락`);
  return errs;
}

export function wiringQuoted(raw: unknown): string[] {
  const d = raw as WiringData;
  return KINDS.map((k) => d?.outcomes?.[k]?.measured).filter((s): s is string => !!s);
}
