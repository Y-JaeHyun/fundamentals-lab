export const SIM_KINDS = ['order', 'verifier', 'hook-picker', 'packet-timeline', 'buffer-loss', 'topic-wiring'] as const;
export type SimKind = (typeof SIM_KINDS)[number];

/** 코스 저장소 루트 기준 경로 (고정 커밋에서 확인한다) */
export interface Source {
  path: string;
  note?: string;
}

export interface Option {
  text: string;
  correct?: boolean;
  feedback: string;
  /** 이 보기를 골랐을 때 실제로 나오는 로그 (출처 파일에 그대로 있어야 함) */
  log?: string;
}

export type Question =
  | { id: string; kind: 'choice'; prompt: string; code?: string; log?: string; options: Option[]; sources: Source[] }
  | { id: string; kind: 'order'; prompt: string; items: string[]; feedback: string; sources: Source[] };

export interface Chapter {
  id: string;
  slug: string;
  title: string;
  summary: string;
  sim?: { kind: SimKind; data: unknown; sources: Source[] };
  questions: Question[];
  run?: { cmd: string; expect?: string; sources: Source[] };
  linksOnly?: boolean;
}

export interface Course {
  id: string;
  title: string;
  summary: string;
  repo: string;
  sha: string;
  chapters: Chapter[];
}

export type SimValidators = Partial<Record<SimKind, (data: unknown) => string[]>>;
