import { parse } from 'yaml';
import type { Course, SimValidators } from './schema';
import { validateCourse } from './validate';

/** files: '/content/<course>/<name>.yaml' → 원문 */
export function loadCoursesFrom(files: Record<string, string>, sims: SimValidators = {}): Course[] {
  const byCourse = new Map<string, Map<string, string>>();
  for (const [path, text] of Object.entries(files)) {
    const m = /\/content\/([^/]+)\/([^/]+)\.yaml$/.exec(path);
    if (!m) continue;
    if (!byCourse.has(m[1])) byCourse.set(m[1], new Map());
    byCourse.get(m[1])!.set(m[2], text);
  }

  const courses: Course[] = [];
  const problems: string[] = [];
  for (const [dir, docs] of [...byCourse].sort(([a], [b]) => a.localeCompare(b))) {
    const metaText = docs.get('course');
    if (metaText === undefined) {
      problems.push(`${dir}: course.yaml 없음`);
      continue;
    }
    const meta = parse(metaText) as Record<string, unknown>;
    const ids = Array.isArray(meta.chapters) ? (meta.chapters as unknown[]).map(String) : [];
    const chapters: unknown[] = [];
    for (const id of ids) {
      const t = docs.get(id);
      if (t === undefined) problems.push(`${dir}/${id}: course.yaml에 있지만 ${id}.yaml 없음`);
      else chapters.push(parse(t));
    }
    for (const name of docs.keys()) {
      if (name !== 'course' && !ids.includes(name)) problems.push(`${dir}/${name}: ${name}.yaml이 course.yaml chapters에 없음`);
    }
    const { course, errors } = validateCourse({ ...meta, chapters }, sims);
    problems.push(...errors.map((e) => `${dir}/${e}`));
    if (course) courses.push(course);
  }
  if (problems.length) throw new Error(`콘텐츠 오류 ${problems.length}건:\n${problems.join('\n')}`);
  return courses;
}

export function loadCourses(sims: SimValidators = {}): Course[] {
  const files = import.meta.glob('/content/*/*.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  return loadCoursesFrom(files, sims);
}
