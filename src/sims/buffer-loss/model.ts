// 버퍼 유실(04장): ring buffer / perf buffer 유실을 버퍼 크기·소비자 지연에 따라 본다.
// 기준점(anchor) = 코스 저장소 04장 README의 transfer 측정표 행 그대로(출처 검사 대상).
// 모델: 같은 버퍼 크기의 실측점 사이를 소비자 지연(µs)에 대해 선형 보간한다. 실측점과 같으면 measured.
// 실측 범위 밖 입력은 범위 끝으로 자른다. 이 보간은 "실측 사이 어디쯤" 감을 주는 용도이며 측정값이 아니다.

export const METHODS = ['map', 'ringbuf-reserve', 'ringbuf-output', 'perf'] as const;
export type Method = (typeof METHODS)[number];
export type Buffer = 'default' | 'small';

const ROW_PREFIX: Record<Method, string> = {
  map: '집계(map)',
  'ringbuf-reserve': 'ringbuf reserve',
  'ringbuf-output': 'ringbuf output',
  perf: 'perf buffer',
};

export interface Anchor {
  buffer: Buffer;
  delayUs: number;
  /** README 측정표의 방식별 4행 그대로 */
  rows: string;
}

export interface BufferLossData {
  anchors: Anchor[];
}

export interface Measured {
  events: number;
  received: number | null;
  lost: number;
}

export function parseAnchor(a: Anchor): Record<Method, Measured> {
  const lines = a.rows.split('\n').map((l) => l.trim());
  const out = {} as Record<Method, Measured>;
  for (const m of METHODS) {
    const line = lines.find((l) => l.startsWith(ROW_PREFIX[m]));
    if (!line) throw new Error(`${ROW_PREFIX[m]} 행 없음`);
    const t = line.slice(ROW_PREFIX[m].length).trim().split(/\s+/);
    if (t.length < 3) throw new Error(`${ROW_PREFIX[m]} 행 열 부족`);
    const events = Number(t[0]);
    const received = t[1] === '-' ? null : Number(t[1]);
    const lost = Number(t[2]);
    if ([events, lost, received ?? 0].some(Number.isNaN)) throw new Error(`${ROW_PREFIX[m]} 숫자 아님`);
    out[m] = { events, received, lost };
  }
  return out;
}

const anchorsOf = (d: BufferLossData, b: Buffer) => d.anchors.filter((a) => a.buffer === b).sort((x, y) => x.delayUs - y.delayUs);

export function delayRange(d: BufferLossData, b: Buffer): [number, number] | null {
  const xs = anchorsOf(d, b);
  return xs.length < 2 ? null : [xs[0].delayUs, xs[xs.length - 1].delayUs];
}

export function estimateLoss(d: BufferLossData, b: Buffer, delayUs: number, m: Method): { lost: number; total: number; measured: boolean } {
  const xs = anchorsOf(d, b);
  const x = Math.min(Math.max(delayUs, xs[0].delayUs), xs[xs.length - 1].delayUs);
  const exact = xs.find((a) => a.delayUs === x);
  if (exact) {
    const p = parseAnchor(exact)[m];
    return { lost: p.lost, total: p.events, measured: true };
  }
  const hi = xs.findIndex((a) => a.delayUs > x);
  const A = parseAnchor(xs[hi - 1])[m];
  const B = parseAnchor(xs[hi])[m];
  const t = (x - xs[hi - 1].delayUs) / (xs[hi].delayUs - xs[hi - 1].delayUs);
  return { lost: Math.round(A.lost + (B.lost - A.lost) * t), total: Math.round(A.events + (B.events - A.events) * t), measured: false };
}

export function validateBufferLoss(d: unknown): string[] {
  const x = d as Partial<BufferLossData> | null;
  if (!x || !Array.isArray(x.anchors) || x.anchors.length < 2) return ['buffer-loss: 기준점은 2개 이상'];
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const a of x.anchors) {
    const key = `${a?.buffer}@${a?.delayUs}`;
    if (a?.buffer !== 'default' && a?.buffer !== 'small') errs.push(`buffer-loss/${key}: buffer는 default|small`);
    if (typeof a?.delayUs !== 'number') errs.push(`buffer-loss/${key}: delayUs 숫자 필요`);
    if (seen.has(key)) errs.push(`buffer-loss/${key}: 기준점 중복`);
    seen.add(key);
    try {
      parseAnchor(a as Anchor);
    } catch (e) {
      errs.push(`buffer-loss/${key}: ${(e as Error).message}`);
    }
  }
  return errs;
}

export function bufferQuoted(d: unknown): string[] {
  return ((d as BufferLossData)?.anchors ?? []).map((a) => a.rows);
}
