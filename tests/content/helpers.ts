export function src(path = 'chapters/00-setup/README.md') {
  return [{ path }];
}
export function choice(id: string, correctCount = 1, n = 3) {
  return {
    id,
    kind: 'choice',
    prompt: '질문',
    options: Array.from({ length: n }, (_, i) => ({ text: `보기${i}`, correct: i < correctCount, feedback: '설명' })),
    sources: src(),
  };
}
export function chapter(id = '00', extra: Record<string, unknown> = {}) {
  return {
    id,
    slug: `${id}-x`,
    title: '제목',
    summary: '요약',
    questions: [choice('q1'), choice('q2'), choice('q3')],
    ...extra,
  };
}
export function course(chapters: unknown[] = [chapter()]) {
  return { id: 'ebpf', title: 'eBPF', summary: '요약', repo: 'https://github.com/x/y', sha: 'a'.repeat(40), chapters };
}
