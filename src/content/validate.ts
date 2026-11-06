import { SIM_KINDS, type Course, type SimKind, type SimValidators } from './schema';

const SUMMARY_MAX = 120;
const FEEDBACK_MAX = 300;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

function checkSources(v: unknown, where: string, errors: string[]) {
  if (!Array.isArray(v) || v.length === 0 || !v.every((s) => isObj(s) && isStr(s.path))) {
    errors.push(`${where}: 출처(sources)가 하나 이상 필요`);
  }
}

function checkFeedback(v: unknown, where: string, errors: string[]) {
  if (!isStr(v)) errors.push(`${where}: feedback 누락`);
  else if (v.length > FEEDBACK_MAX) errors.push(`${where}: feedback이 ${FEEDBACK_MAX}자를 넘음 (${v.length})`);
}

function checkQuestion(q: unknown, chId: string, errors: string[]): string | undefined {
  if (!isObj(q) || !isStr(q.id)) {
    errors.push(`${chId}: id 없는 문제`);
    return undefined;
  }
  const where = `${chId}/${q.id}`;
  if (!isStr(q.prompt)) errors.push(`${where}: prompt 누락`);
  checkSources(q.sources, where, errors);
  if (q.kind === 'choice') {
    const opts = q.options;
    if (!Array.isArray(opts) || opts.length < 2 || opts.length > 4) {
      errors.push(`${where}: 보기는 2~4개`);
    } else {
      const correct = opts.filter((o) => isObj(o) && o.correct === true).length;
      if (correct !== 1) errors.push(`${where}: 정답 보기는 정확히 1개 (현재 ${correct})`);
      opts.forEach((o, i) => {
        if (!isObj(o) || !isStr(o.text)) errors.push(`${where}: 보기 ${i} text 누락`);
        checkFeedback(isObj(o) ? o.feedback : undefined, `${where} 보기 ${i}`, errors);
      });
    }
  } else if (q.kind === 'order') {
    if (!Array.isArray(q.items) || q.items.length < 2 || !q.items.every(isStr)) errors.push(`${where}: 순서 항목은 2개 이상`);
    checkFeedback(q.feedback, where, errors);
  } else {
    errors.push(`${where}: 알 수 없는 문제 종류 ${String(q.kind)}`);
  }
  return q.id;
}

function checkChapter(ch: unknown, sims: SimValidators, errors: string[]) {
  if (!isObj(ch) || !isStr(ch.id)) {
    errors.push('id 없는 장');
    return;
  }
  const id = ch.id;
  if (!/^[0-9a-z]+$/.test(id)) errors.push(`${id}: 장 id는 소문자·숫자만`);
  for (const k of ['slug', 'title', 'summary'] as const) if (!isStr(ch[k])) errors.push(`${id}: ${k} 누락`);
  if (isStr(ch.summary) && ch.summary.length > SUMMARY_MAX) errors.push(`${id}: summary가 ${SUMMARY_MAX}자를 넘음`);

  const qs = Array.isArray(ch.questions) ? ch.questions : [];
  if (!Array.isArray(ch.questions)) errors.push(`${id}: questions 누락`);
  if (ch.linksOnly !== true && (qs.length < 3 || qs.length > 5)) errors.push(`${id}: 문제는 3~5개 (현재 ${qs.length})`);
  const seen = new Set<string>();
  for (const q of qs) {
    const qid = checkQuestion(q, id, errors);
    if (qid === undefined) continue;
    if (seen.has(qid)) errors.push(`${id}/${qid}: 문제 id 중복`);
    seen.add(qid);
  }

  if (ch.sim !== undefined) {
    const sim = ch.sim;
    if (!isObj(sim) || !SIM_KINDS.includes(sim.kind as SimKind)) {
      errors.push(`${id}/sim: 알 수 없는 시뮬레이션 종류 ${isObj(sim) ? String(sim.kind) : ''}`);
    } else {
      checkSources(sim.sources, `${id}/sim`, errors);
      const v = sims[sim.kind as SimKind];
      if (v) for (const e of v(sim.data)) errors.push(`${id}/sim: ${e}`);
    }
  }
  if (ch.run !== undefined) {
    if (!isObj(ch.run) || !isStr(ch.run.cmd)) errors.push(`${id}/run: cmd 누락`);
    else checkSources(ch.run.sources, `${id}/run`, errors);
  }
}

export function validateCourse(raw: unknown, sims: SimValidators = {}): { course?: Course; errors: string[] } {
  const errors: string[] = [];
  if (!isObj(raw)) return { errors: ['코스가 객체가 아님'] };
  for (const k of ['id', 'title', 'summary', 'repo', 'sha'] as const) if (!isStr(raw[k])) errors.push(`course: ${k} 누락`);
  if (!Array.isArray(raw.chapters)) errors.push('course: chapters 누락');
  else {
    const ids = new Set<string>();
    for (const ch of raw.chapters) {
      checkChapter(ch, sims, errors);
      if (isObj(ch) && isStr(ch.id)) {
        if (ids.has(ch.id)) errors.push(`${ch.id}: 장 id 중복`);
        ids.add(ch.id);
      }
    }
  }
  return errors.length ? { errors } : { course: raw as unknown as Course, errors };
}
