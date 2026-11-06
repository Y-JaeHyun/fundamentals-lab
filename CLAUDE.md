# fundamentals-lab — 작업 규칙

- 개인 **public** repo. **기준 브랜치는 `main`** — 전역 CLAUDE.md의 `proto` 기준 규칙은 회사 repo 전용이며 여기엔 해당 없음.
- 시작 시 `docs/superpowers/specs/2026-11-06-fundamentals-lab-design.md`를 먼저 읽는다.
- **공개 저장소다.** 회사 관련 내용·내부 경로(`/mnt/data/...` 포함)·사내 코드·토큰은 절대 커밋하지 않는다. 로컬 코스 저장소 경로는 환경변수 `COURSE_SRC_EBPF`로만 넘긴다. push 전에 `git diff --cached`로 확인한다.
- **질적 결과는 실측만**: 통과/거부, 에러 메시지, EPERM vs 타임아웃 등은 코스 저장소 고정 커밋의 파일에 있는 것만 쓴다. 근거 없는 선택지·미션은 만들지 않는다.
- **수치는 실측점 기반 추정 허용**: 실측점이 아닌 수치는 "추정치" 배지, 실측 범위를 넘는 입력은 막는다.
- 콘텐츠(`content/`)를 바꾸면 `npm test && COURSE_SRC_EBPF=<코스 저장소 clone> npm run check-sources`가 통과해야 한다.
- 모든 문서·화면 문구는 한국어. 용어는 처음 나올 때 `한국어(영어)`.
- 라이선스: 코드 MIT, `content/` CC BY-SA 4.0.
