/**
 * 콘텐츠 출처 검사: 각 코스의 출처 경로·인용 줄이 코스 저장소 고정 커밋에 실제로 있는지 확인한다.
 * 사용: COURSE_SRC_EBPF=<ebpf-fundamentals-kr clone> npm run check-sources
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCoursesFrom } from '../src/content/load';
import { checkCourseSources, type RepoReader } from '../src/content/sources';
import { simQuoted, simValidators } from '../src/sims/node-registry';

const root = join(import.meta.dirname, '..');
const files: Record<string, string> = {};
for (const dir of readdirSync(join(root, 'content'))) {
  for (const f of readdirSync(join(root, 'content', dir))) {
    if (f.endsWith('.yaml')) files[`/content/${dir}/${f}`] = readFileSync(join(root, 'content', dir, f), 'utf8');
  }
}

function gitReader(src: string, sha: string): RepoReader {
  const cache = new Map<string, string | null>();
  const show = (p: string) => {
    if (!cache.has(p)) {
      try {
        cache.set(p, execFileSync('git', ['-C', src, 'show', `${sha}:${p}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 }));
      } catch {
        cache.set(p, null);
      }
    }
    return cache.get(p) ?? null;
  };
  return { exists: (p) => show(p) !== null, read: (p) => show(p) ?? '' };
}

let total = 0;
for (const course of loadCoursesFrom(files, simValidators())) {
  const envName = `COURSE_SRC_${course.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  const src = process.env[envName];
  if (!src) {
    console.error(`${course.id}: 환경변수 ${envName}에 코스 저장소 clone 경로를 지정하세요`);
    process.exit(2);
  }
  const errs = checkCourseSources(course, gitReader(src, course.sha), simQuoted);
  for (const e of errs) console.error(`${course.id}/${e}`);
  total += errs.length;
  console.log(`${course.id}: 장 ${course.chapters.length}개 검사, 오류 ${errs.length}건`);
}
console.log(`${total} errors`);
process.exit(total ? 1 : 0);
