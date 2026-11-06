// hook 고르기 미션(10·11장): 미션을 읽고 패킷/시스템 콜을 잡을 자리를 고른다.
// outcome.measured는 코스 저장소 README의 실행 결과 줄을 그대로 쓴다(출처 검사 대상).

export const HOOKS = {
  nic: { label: 'NIC', lane: 'in', note: '하드웨어', fixed: true },
  xdp: { label: 'XDP', lane: 'in', note: '드라이버, sk_buff 이전' },
  'tc-ingress': { label: 'TC ingress', lane: 'in', note: 'sk_buff 생성 후' },
  netfilter: { label: 'netfilter', lane: 'in', note: 'PRE_ROUTING·LOCAL_IN' },
  'socket-filter': { label: '소켓 필터', lane: 'in', note: '소켓 하나' },
  app: { label: '앱', lane: 'in', note: 'recv()', fixed: true },
  'app-out': { label: '앱', lane: 'out', note: 'connect()·sendto()', fixed: true },
  'cgroup-connect4': { label: 'cgroup connect4', lane: 'out', note: 'connect() 시스템 콜' },
  'cgroup-sendmsg4': { label: 'cgroup sendmsg4', lane: 'out', note: 'UDP sendto() 시스템 콜' },
  'tc-egress': { label: 'TC egress', lane: 'out', note: '나가기 직전 sk_buff' },
  'nic-out': { label: 'NIC', lane: 'out', note: '하드웨어', fixed: true },
} as const satisfies Record<string, { label: string; lane: 'in' | 'out'; note: string; fixed?: boolean }>;

export type HookId = keyof typeof HOOKS;
export const LANE_ORDER: Record<'in' | 'out', HookId[]> = {
  in: ['nic', 'xdp', 'tc-ingress', 'netfilter', 'socket-filter', 'app'],
  out: ['app-out', 'cgroup-connect4', 'cgroup-sendmsg4', 'tc-egress', 'nic-out'],
};

export interface Outcome {
  text: string;
  /** 실측 결과 줄 — README에 그대로 있어야 함 */
  measured?: string;
}

export interface Mission {
  id: string;
  prompt: string;
  /** 이 미션에서 고를 수 있는 hook */
  hooks: HookId[];
  answer: HookId;
  outcomes: Partial<Record<HookId, Outcome>>;
}

export interface HookPickerData {
  missions: Mission[];
}

export interface PickState {
  cleared: string[];
}

export const emptyPickState = (): PickState => ({ cleared: [] });

const isHook = (h: unknown): h is HookId => typeof h === 'string' && h in HOOKS && !('fixed' in HOOKS[h as HookId]);

export function validateHookPicker(d: unknown): string[] {
  const x = d as Partial<HookPickerData> | null;
  if (!x || !Array.isArray(x.missions) || x.missions.length < 2) return ['hook-picker: 미션은 2개 이상'];
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const m of x.missions) {
    const id = m?.id ?? '?';
    if (ids.has(id)) errs.push(`hook-picker/${id}: id 중복`);
    ids.add(id);
    if (typeof m?.prompt !== 'string' || !m.prompt) errs.push(`hook-picker/${id}: prompt 누락`);
    const hooks = Array.isArray(m?.hooks) ? m.hooks : [];
    if (hooks.length < 2) errs.push(`hook-picker/${id}: hook 선택지는 2개 이상`);
    for (const h of hooks) {
      if (!isHook(h)) errs.push(`hook-picker/${id}: 알 수 없는 hook ${String(h)}`);
      else if (!m.outcomes?.[h]?.text) errs.push(`hook-picker/${id}: ${h} 결과(outcome) 누락`);
    }
    if (!hooks.includes(m?.answer)) errs.push(`hook-picker/${id}: 정답 hook이 선택지에 없음`);
  }
  return errs;
}

export function pick(state: PickState, data: HookPickerData, missionId: string, hook: HookId): { state: PickState; correct: boolean; outcome: Outcome } {
  const m = data.missions.find((x) => x.id === missionId)!;
  const correct = m.answer === hook;
  const outcome = m.outcomes[hook] ?? { text: '' };
  if (!correct || state.cleared.includes(missionId)) return { state, correct, outcome };
  return { state: { cleared: [...state.cleared, missionId] }, correct, outcome };
}

export function isPickComplete(state: PickState, data: HookPickerData): boolean {
  return data.missions.every((m) => state.cleared.includes(m.id));
}

export function hookQuoted(d: unknown): string[] {
  const x = d as HookPickerData;
  return (x?.missions ?? []).flatMap((m) => m.hooks.map((h) => m.outcomes[h]?.measured).filter((s): s is string => !!s));
}
