import type { Course, Source } from '../content/schema';
import { h } from './dom';

export const measuredBadge = () => h('span', { class: 'badge measured', title: '코스 저장소에서 실제로 실행한 결과' }, '실측');
export const estimatedBadge = () => h('span', { class: 'badge estimated', title: '실측값 사이를 단순 계산으로 추정한 값' }, '추정치');
export const kernelNote = () => h('span', { class: 'badge kernel' }, 'kernel 6.17 기준');

export function fileUrl(course: Course, path: string) {
  return `${course.repo}/blob/${course.sha}/${path}`;
}

export function sourceList(course: Course, sources: Source[]): HTMLElement {
  const p = h('p', { class: 'sources' }, '출처: ');
  sources.forEach((s, i) => {
    if (i) p.append(' · ');
    p.append(h('a', { href: fileUrl(course, s.path), target: '_blank', rel: 'noopener' }, s.note ?? s.path));
  });
  return p;
}

/** 로그 블록 + 실측 배지 */
export function logBlock(text: string): HTMLElement {
  return h('div', { class: 'logwrap' }, measuredBadge(), h('pre', { class: 'log' }, text));
}
