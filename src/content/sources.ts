import type { Course, SimKind, Source } from './schema';

export interface RepoReader {
  exists(path: string): boolean;
  read(path: string): string;
}

export type SimQuoted = (kind: SimKind, data: unknown) => string[];

const ELLIPSIS = new Set(['...', '…']);

function quoteErrors(where: string, text: string | undefined, sources: Source[], repo: RepoReader): string[] {
  if (!text) return [];
  const bodies = sources.filter((s) => repo.exists(s.path)).map((s) => repo.read(s.path));
  const errs: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || ELLIPSIS.has(line)) continue;
    if (!bodies.some((b) => b.includes(line))) errs.push(`${where}: 출처 파일에 없는 줄 "${line}"`);
  }
  return errs;
}

function pathErrors(where: string, sources: Source[], repo: RepoReader): string[] {
  return sources.filter((s) => !repo.exists(s.path)).map((s) => `${where}: 고정 커밋에 없는 경로 ${s.path}`);
}

/** 콘텐츠의 모든 출처 경로와 인용 줄을 코스 저장소 고정 커밋과 대조한다. */
export function checkCourseSources(course: Course, repo: RepoReader, simQuoted?: SimQuoted): string[] {
  const errs: string[] = [];
  for (const ch of course.chapters) {
    for (const q of ch.questions) {
      const where = `${ch.id}/${q.id}`;
      errs.push(...pathErrors(where, q.sources, repo));
      if (q.kind === 'choice') {
        errs.push(...quoteErrors(where, q.log, q.sources, repo));
        errs.push(...quoteErrors(where, q.code, q.sources, repo));
        q.options.forEach((o, i) => errs.push(...quoteErrors(`${where} 보기 ${i}`, o.log, q.sources, repo)));
      }
    }
    if (ch.run) {
      errs.push(...pathErrors(`${ch.id}/run`, ch.run.sources, repo));
      errs.push(...quoteErrors(`${ch.id}/run`, ch.run.expect, ch.run.sources, repo));
    }
    if (ch.sim) {
      errs.push(...pathErrors(`${ch.id}/sim`, ch.sim.sources, repo));
      const lines = simQuoted ? simQuoted(ch.sim.kind, ch.sim.data) : [];
      errs.push(...quoteErrors(`${ch.id}/sim`, lines.join('\n'), ch.sim.sources, repo));
    }
  }
  return errs;
}
