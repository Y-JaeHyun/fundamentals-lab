import type { Chapter } from './content/schema';

export type Status = 'new' | 'in-progress' | 'done';

export interface ChapterProgress {
  sim: boolean;
  /** 한 번이라도 맞힌 문제 id */
  answers: Record<string, true>;
}

export interface ProgressStore {
  get(course: string, chapter: string): ChapterProgress;
  markSim(course: string, chapter: string): void;
  markCorrect(course: string, chapter: string, questionId: string): void;
  status(course: string, chapter: Chapter): Status;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
type Data = Record<string, ChapterProgress>;

export const STORAGE_KEY = 'fundamentals-lab:v1';

function read(storage: Storage | null): Data {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return {};
    const v: unknown = JSON.parse(raw);
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
    const out: Data = {};
    for (const [k, p] of Object.entries(v as Record<string, unknown>)) {
      if (typeof p !== 'object' || p === null) continue;
      const rec = p as Record<string, unknown>;
      const answers: Record<string, true> = {};
      if (typeof rec.answers === 'object' && rec.answers !== null) {
        for (const [q, ok] of Object.entries(rec.answers)) if (ok === true) answers[q] = true;
      }
      out[k] = { sim: rec.sim === true, answers };
    }
    return out;
  } catch {
    return {};
  }
}

export function createProgressStore(storage: Storage | null): ProgressStore {
  const data = read(storage);
  const key = (c: string, ch: string) => `${c}/${ch}`;
  const entry = (c: string, ch: string) => (data[key(c, ch)] ??= { sim: false, answers: {} });
  // 다른 탭이 그 사이에 쓴 진행도를 잃지 않도록, 쓰기 직전에 다시 읽어 합친다(완료 표시는 늘기만 한다).
  const save = () => {
    try {
      const latest = read(storage);
      for (const [k, p] of Object.entries(latest)) {
        const mine = (data[k] ??= { sim: false, answers: {} });
        mine.sim ||= p.sim;
        Object.assign(mine.answers, p.answers);
      }
      storage?.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* 저장 불가 환경: 이번 방문 동안만 유지 */
    }
  };

  return {
    get(c, ch) {
      const p = data[key(c, ch)];
      return p ? { sim: p.sim, answers: { ...p.answers } } : { sim: false, answers: {} };
    },
    markSim(c, ch) {
      entry(c, ch).sim = true;
      save();
    },
    markCorrect(c, ch, q) {
      entry(c, ch).answers[q] = true;
      save();
    },
    status(c, chapter) {
      if (chapter.linksOnly) return 'new';
      const p = data[key(c, chapter.id)];
      if (!p) return 'new';
      const simOk = !chapter.sim || p.sim;
      const allAnswered = chapter.questions.every((q) => p.answers[q.id]);
      if (simOk && allAnswered) return 'done';
      const any = p.sim || chapter.questions.some((q) => p.answers[q.id]);
      return any ? 'in-progress' : 'new';
    },
  };
}
