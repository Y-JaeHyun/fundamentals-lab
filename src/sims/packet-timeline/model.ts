// 패킷 타임라인(09장): 같은 UDP 패킷이 hook 7곳을 지나는 시각을 README의 실측 행 그대로 재생한다.
// 단계별 값은 row 문자열을 파싱해서 얻는다(숫자를 따로 옮겨 적지 않는다). 추정 없음.

export const STAGES = ['XDP', 'TC', 'ip_rcv_core', 'NF_PRE', 'NF_IN', 'udp_rcv', 'socket', 'app'] as const;
export type Stage = (typeof STAGES)[number];

export interface Scenario {
  id: string;
  label: string;
  /** README 표의 1번 패킷 행 그대로: seq XDP TC ip_rcv_core NF_PRE NF_IN udp_rcv socket app */
  row: string;
  /** "앱이 받은 패킷: N/10" 줄 그대로 */
  received: string;
}

export interface PacketTimelineData {
  scenarios: Scenario[];
}

export interface ParsedRow {
  /** 앞 단계를 지난 뒤 걸린 µs. 오지 않은 hook은 null. app은 값 대신 delivered로 */
  values: Partial<Record<Stage, number | null>>;
  reached: Stage[];
  dropAt: Stage | null;
  delivered: boolean;
}

export function parseRow(row: string): ParsedRow {
  const t = row.trim().split(/\s+/);
  if (t.length !== STAGES.length + 1) throw new Error(`열 개수 ${t.length - 1} (기대 ${STAGES.length})`);
  const values: ParsedRow['values'] = {};
  const reached: Stage[] = [];
  STAGES.forEach((s, i) => {
    const v = t[i + 1];
    if (s === 'app') {
      if (v === '받음') reached.push('app');
      return;
    }
    const n = v === '-' ? null : Number(v);
    if (n !== null && Number.isNaN(n)) throw new Error(`${s} 값이 숫자가 아님: ${v}`);
    values[s] = n;
    if (n !== null) reached.push(s);
  });
  const delivered = reached.includes('app');
  return { values, reached, delivered, dropAt: delivered ? null : (reached[reached.length - 1] ?? null) };
}

export function validateTimeline(d: unknown): string[] {
  const x = d as Partial<PacketTimelineData> | null;
  if (!x || !Array.isArray(x.scenarios) || x.scenarios.length < 2) return ['packet-timeline: 시나리오는 2개 이상'];
  const errs: string[] = [];
  for (const s of x.scenarios) {
    const id = s?.id ?? '?';
    try {
      const p = parseRow(String(s?.row ?? ''));
      const m = /앱이 받은 패킷: (\d+)\/(\d+)/.exec(String(s?.received ?? ''));
      if (!m) errs.push(`packet-timeline/${id}: received 형식 오류`);
      else if ((Number(m[1]) > 0) !== p.delivered) errs.push(`packet-timeline/${id}: received(${m[1]}/${m[2]})가 행의 app 칸과 맞지 않음`);
    } catch (e) {
      errs.push(`packet-timeline/${id}: ${(e as Error).message}`);
    }
    if (!s?.label) errs.push(`packet-timeline/${id}: label 누락`);
  }
  return errs;
}

export function isTimelineComplete(viewed: Set<string>, d: PacketTimelineData): boolean {
  return d.scenarios.every((s) => viewed.has(s.id));
}

export function timelineQuoted(d: unknown): string[] {
  return ((d as PacketTimelineData)?.scenarios ?? []).flatMap((s) => [s.row, s.received]);
}
