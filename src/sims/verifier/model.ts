// Verifier 퍼즐(05장): 거부된 코드 + 실제 verifier 로그를 보고 고칠 방법을 고른다.
// 모든 코드·로그는 코스 저장소 고정 커밋의 파일에서 그대로 가져온다(출처 검사 대상).

export interface VerifierOption {
  text: string;
  correct?: boolean;
  feedback: string;
  /** 이 보기를 적용했을 때 실제로 나온 로그 — 실측이 있을 때만 */
  log?: string;
}

export interface VerifierCase {
  id: string;
  title: string;
  /** 거부되는 코드 발췌 */
  code: string;
  /** code에서 문제가 되는 줄 번호 (1부터) */
  hot: number;
  /** 고친 코드 발췌 */
  fixed: string;
  badLog: string;
  /** 고친 버전이 통과한 실측 로그 — 저장소 README에 있을 때만 */
  goodLog?: string;
  options: VerifierOption[];
}

export interface VerifierData {
  cases: VerifierCase[];
}

export interface VerifierState {
  solved: string[];
}

export const emptyState = (): VerifierState => ({ solved: [] });

const str = (v: unknown) => typeof v === 'string' && v.length > 0;

export function validateVerifier(d: unknown): string[] {
  const x = d as Partial<VerifierData> | null;
  if (!x || !Array.isArray(x.cases) || x.cases.length < 3) return ['verifier: 케이스는 3개 이상'];
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const c of x.cases) {
    const id = c?.id ?? '?';
    if (ids.has(id)) errs.push(`verifier/${id}: id 중복`);
    ids.add(id);
    for (const k of ['title', 'code', 'fixed', 'badLog'] as const) if (!str(c?.[k])) errs.push(`verifier/${id}: ${k} 누락`);
    const lines = str(c?.code) ? c.code.split('\n').length : 0;
    if (!Number.isInteger(c?.hot) || c.hot < 1 || c.hot > lines) errs.push(`verifier/${id}: hot 줄 번호가 code 범위 밖`);
    const opts = Array.isArray(c?.options) ? c.options : [];
    if (opts.length < 2 || opts.length > 4) errs.push(`verifier/${id}: 보기는 2~4개`);
    if (opts.filter((o) => o?.correct === true).length !== 1) errs.push(`verifier/${id}: 정답 보기는 정확히 1개`);
    opts.forEach((o, i) => {
      if (!str(o?.text) || !str(o?.feedback)) errs.push(`verifier/${id}: 보기 ${i} text/feedback 누락`);
    });
  }
  return errs;
}

export function pickOption(state: VerifierState, data: VerifierData, caseId: string, optionIndex: number): { state: VerifierState; result: 'pass' | 'reject' } {
  const c = data.cases.find((x) => x.id === caseId);
  const ok = c?.options[optionIndex]?.correct === true;
  if (!ok) return { state, result: 'reject' };
  if (state.solved.includes(caseId)) return { state, result: 'pass' };
  return { state: { solved: [...state.solved, caseId] }, result: 'pass' };
}

export function isComplete(state: VerifierState, data: VerifierData): boolean {
  return data.cases.every((c) => state.solved.includes(c.id));
}

export function verifierQuoted(d: unknown): string[] {
  const x = d as VerifierData;
  return (x?.cases ?? []).flatMap((c) => [c.code, c.fixed, c.badLog, c.goodLog ?? '', ...c.options.map((o) => o.log ?? '')].filter(Boolean));
}
