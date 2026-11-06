import type { Course } from './content/schema';

export type Route = { kind: 'map' } | { kind: 'chapter'; course: string; chapter: string };

const MAP: Route = { kind: 'map' };

export function parseHash(hash: string, courses: Course[]): Route {
  const m = /^#([a-z0-9]+)-([0-9a-z]+)$/.exec(hash);
  if (!m) return MAP;
  const c = courses.find((x) => x.id === m[1]);
  if (!c || !c.chapters.some((ch) => ch.id === m[2])) return MAP;
  return { kind: 'chapter', course: m[1], chapter: m[2] };
}

export function toHash(r: Route): string {
  return r.kind === 'map' ? '#map' : `#${r.course}-${r.chapter}`;
}
