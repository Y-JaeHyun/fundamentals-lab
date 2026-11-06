# 기초체력 랩 v1 (공통 틀 + eBPF 트랙) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `ebpf-fundamentals-kr`의 각 장을 "만져 보기 → 문제 풀이 → 진짜로 돌려 보기" 세 단계로 깨는 정적 학습 사이트를 만들고, 여러 코스를 꽂을 수 있는 공통 틀로 구성한다.

**Architecture:** Vite + TypeScript 정적 SPA(프레임워크 없음). 코스·장·문제는 `content/<course>/*.yaml` 데이터이고, 시뮬레이션은 `src/sims/<kind>/`의 모듈(순수 로직 `model.ts` + DOM `view.ts`)이다. 진행도는 localStorage. 출처 검사 스크립트가 콘텐츠의 모든 출처 경로·인용 로그를 코스 저장소의 고정 커밋과 대조한다.

**Tech Stack:** Node 22, Vite 6, TypeScript 5 (strict), Vitest 3 + jsdom, `yaml` 2.x, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-06-fundamentals-lab-design.md`

## Global Constraints

- 정적 사이트만: 서버·DB·외부 API·외부 런타임 fetch 없음. GitHub Pages 하위 경로(`/fundamentals-lab/`)에서 동작 → Vite `base: './'`.
- 공개 저장소: 회사 관련 내용·내부 경로(`/mnt/data/...` 포함)·사내 코드·토큰을 커밋하지 않는다. 로컬 코스 저장소 경로는 환경변수 `COURSE_SRC_EBPF`로만 받는다.
- 기준 브랜치 `main`(개인 저장소 — 전역 `proto` 규칙 해당 없음).
- 화면 문구·문서 전부 한국어. 용어는 처음 나올 때 `한국어(영어)`, 표기는 `ebpf-fundamentals-kr/GLOSSARY.md`를 따른다.
- 라이트·다크 테마(토큰 + `prefers-color-scheme`), 폭 400px에서 가로 스크롤 없음, 모든 조작 키보드 가능, `prefers-reduced-motion` 시 애니메이션 생략.
- localStorage 읽기·쓰기는 전부 try/catch. 실패해도 페이지는 정상 동작.
- 출처 고정: 코스 `ebpf`, 저장소 `https://github.com/Y-JaeHyun/ebpf-fundamentals-kr`, 커밋 `db1dab9094f735f40ea47a079e4d7c0a516b8455`.
- **질적 결과는 실측만**: 통과/거부, 에러 메시지, EPERM vs 타임아웃, 어느 hook에 보이는지 등은 고정 커밋의 파일에 있는 것만 쓴다. 근거 없는 선택지·미션은 만들지 않는다.
- **수치는 실측점 기반 추정 허용**: 실측 기준점이 아닌 수치에는 화면에 "추정치" 배지, 실측점은 "실측" 배지. 슬라이더 범위는 실측 범위를 넘지 않는다. 커널마다 달라지는 값에는 "kernel 6.17 기준" 표시.
- 한 화면 설명은 몇 줄 이내(장 요약 `summary` ≤ 120자, 문제 피드백 ≤ 300자). 조작이 설명보다 먼저 보인다.
- 장 순서는 추천일 뿐 잠그지 않는다.
- 라이선스: 코드 MIT(`LICENSE`), `content/` CC BY-SA 4.0(`LICENSE-content`).
- 저장소 생성·push·Pages 공개는 사용자 승인 후(Task 12의 마지막 단계는 승인 대기).

## Review Focus

1. **localStorage 차단·손상**: 사생활 보호 모드(접근 시 throw)나 손상된 JSON이 있어도 지도·장 화면이 정상 표시되고 진행도만 빈 상태여야 한다 → Task 3 테스트 `survives throwing storage`, `resets corrupt json`.
2. **콘텐츠 변경 후 옛 진행도**: 문제 ID가 지워지거나 새로 생겨도 상태 계산이 깨지지 않고, 새 문제가 생긴 장은 "진행 중"으로 돌아가야 한다 → Task 3 `status ignores unknown ids`, `new question reopens chapter`.
3. **잘못된 해시 진입**: `#ebpf-99`, `#nope`, `#ebpf-05/x`, 빈 해시로 들어와도 지도로 떨어져야 한다(빈 화면 금지) → Task 3 `unknown routes fall back to map`.
4. **인용 로그 오타·변조**: 화면에 보이는 에러 로그·코드 줄이 출처 파일에 실제로 없으면 CI가 실패해야 한다 → Task 4 `fails when quoted line missing`.
5. **좁은 화면의 넓은 요소**: 400px 폭에서 코드 블록·패킷 레인·타임라인 표가 페이지를 가로로 밀지 않아야 한다(자체 `overflow-x:auto`) → Task 5 `wide blocks scroll inside container` (jsdom에서 클래스·스타일 규칙 존재 검사) + Task 12 수동 확인 항목.

---

## 파일 구조

```
fundamentals-lab/
  package.json  tsconfig.json  vite.config.ts  index.html
  LICENSE  LICENSE-content  README.md  CLAUDE.md  .gitignore
  .github/workflows/deploy.yml
  content/ebpf/course.yaml                 코스 메타 + 장 순서
  content/ebpf/<chapter-id>.yaml           장 하나(요약·sim·문제·run)
  scripts/check-sources.ts                 출처 대조 (CLI)
  src/main.ts                              부팅: 콘텐츠 로드 → 라우터 → 화면
  src/router.ts                            해시 ↔ Route
  src/progress.ts                          진행도 저장소
  src/content/schema.ts                    타입
  src/content/validate.ts                  런타임 검증
  src/content/load.ts                      YAML 로드(import.meta.glob)
  src/ui/theme.css                         토큰·공통 스타일
  src/ui/map-view.ts  src/ui/chapter-view.ts
  src/ui/quiz.ts  src/ui/order.ts  src/ui/badges.ts
  src/sims/registry.ts
  src/sims/verifier/{model.ts,view.ts}     05장
  src/sims/hook-picker/{model.ts,view.ts}  10·11장
  src/sims/packet-timeline/{model.ts,view.ts}  09장
  src/sims/buffer-loss/{model.ts,view.ts}  04장
  tests/**                                 Vitest
```

01장 시뮬레이션은 별도 모듈 없이 `order` 종류(공용 `ui/order.ts`)를 쓴다.

---

### Task 1: 저장소 골격

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `.gitignore`, `LICENSE`(MIT, 저작자 Y-JaeHyun), `LICENSE-content`(CC BY-SA 4.0 전문 — `ebpf-fundamentals-kr/LICENSE-docs` 복사), `README.md`(한 문단 소개 + `npm ci && npm run dev`), `CLAUDE.md`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: npm 스크립트 `dev`, `build`, `test`(=`vitest run`), `typecheck`(=`tsc --noEmit`), `check-sources`(=`tsx scripts/check-sources.ts`). Vitest 환경 jsdom.

- [ ] **Step 1:** `/mnt/data/Y-jaehyun/fundamentals-lab`에서 `git init -b main` (설계 문서는 이미 `docs/`에 있음).
- [ ] **Step 2:** 의존성 고정: dev `vite@6`, `typescript@5`, `vitest@3`, `jsdom`, `tsx`, `@types/node`; dep `yaml@2`. `package-lock.json` 커밋.
- [ ] **Step 3:** `CLAUDE.md`에 작업 규칙 기록: 공개 저장소 규칙(위 Global Constraints의 공개·출처·실측 규칙 그대로), 기준 브랜치 `main`, 콘텐츠 추가 시 `npm test && npm run check-sources` 필수.
- [ ] **Step 4:** 실패 테스트 `tests/smoke.test.ts`: `import { APP_NAME } from '../src/main'` → `expect(APP_NAME).toBe('기초체력 랩')`. `npm test` → FAIL.
- [ ] **Step 5:** `src/main.ts`에 `export const APP_NAME = '기초체력 랩'`. `vite.config.ts`: `base: './'`, `test: { environment: 'jsdom' }`. `npm test` PASS, `npm run typecheck` PASS, `npm run build` 성공.
- [ ] **Step 6:** Commit `chore: 저장소 골격 (Vite+TS, 라이선스, 작업 규칙)`.

---

### Task 2: 콘텐츠 스키마·검증·로더

**Files:**
- Create: `src/content/schema.ts`, `src/content/validate.ts`, `src/content/load.ts`
- Test: `tests/content/validate.test.ts`, `tests/content/fixtures/*.yaml`

**Interfaces:**
- Produces (`schema.ts`):
  ```ts
  type SimKind = 'order' | 'verifier' | 'hook-picker' | 'packet-timeline' | 'buffer-loss';
  interface Source { path: string; note?: string }           // 코스 저장소 루트 기준 경로
  interface Option { text: string; correct?: boolean; feedback: string; log?: string }
  type Question =
    | { id: string; kind: 'choice'; prompt: string; code?: string; log?: string; options: Option[]; sources: Source[] }
    | { id: string; kind: 'order'; prompt: string; items: string[]; feedback: string; sources: Source[] }; // items = 정답 순서
  interface Chapter { id: string; slug: string; title: string; summary: string;
    sim?: { kind: SimKind; data: unknown; sources: Source[] };
    questions: Question[];
    run?: { cmd: string; expect?: string; sources: Source[] };
    linksOnly?: boolean }
  interface Course { id: string; title: string; summary: string; repo: string; sha: string; chapters: Chapter[] }
  ```
- Produces: `validateCourse(raw: unknown, simValidators?: Partial<Record<SimKind,(d:unknown)=>string[]>>): { course?: Course; errors: string[] }`; `loadCourses(): Course[]` (`import.meta.glob('/content/*/*.yaml', { query: '?raw', import: 'default', eager: true })`, `course.yaml`의 `chapters: [id...]` 순서로 장 조립, 검증 실패 시 throw — 빌드·테스트에서 바로 드러나게).

- [ ] **Step 1: 실패 테스트** `tests/content/validate.test.ts`:
  - `accepts minimal valid course` → `errors` 빈 배열.
  - `rejects choice with zero or two correct options` → 에러 문자열에 문제 ID 포함.
  - `rejects duplicate question ids in a chapter`.
  - `rejects question without sources`.
  - `requires 3..5 questions unless linksOnly`.
  - `rejects 'options' outside 2..4`.
  - `rejects summary over 120 chars and feedback over 300 chars`.
  - `rejects unknown sim kind` 및 `runs sim validator and prefixes errors with chapter id`.
  - `chapter ids are lowercase [0-9a-z]+` (부록은 `a`).
- [ ] **Step 2:** `npm test -- validate` → FAIL.
- [ ] **Step 3:** `schema.ts`, `validate.ts` 구현. 에러는 한 번에 모두 모아 `"<chapter>/<question>: <이유>"` 형식.
- [ ] **Step 4:** `npm test` PASS.
- [ ] **Step 5:** `load.ts` 구현 + 테스트 `loads courses in course.yaml order`(fixture 디렉터리를 쓰도록 `loadCoursesFrom(files: Record<string,string>)`를 분리해 테스트하고, `loadCourses()`는 glob 결과를 넘기는 얇은 래퍼).
- [ ] **Step 6:** Commit `feat: 콘텐츠 스키마·검증·로더`.

---

### Task 3: 라우터·진행도

**Files:**
- Create: `src/router.ts`, `src/progress.ts`
- Test: `tests/router.test.ts`, `tests/progress.test.ts`

**Interfaces:**
- Consumes: `Course`, `Chapter` (Task 2).
- Produces:
  ```ts
  type Route = { kind: 'map' } | { kind: 'chapter'; course: string; chapter: string };
  parseHash(hash: string, courses: Course[]): Route;   // '#ebpf-05' → chapter; 그 외 전부 map
  toHash(r: Route): string;                            // map → '#map', chapter → '#ebpf-05'
  type Status = 'new' | 'in-progress' | 'done';
  interface ChapterProgress { sim: boolean; answers: Record<string, true> } // 한 번이라도 맞힌 문제만
  interface ProgressStore {
    get(course: string, chapter: string): ChapterProgress;
    markSim(course: string, chapter: string): void;
    markCorrect(course: string, chapter: string, questionId: string): void;
    status(course: string, chapter: Chapter): Status;
  }
  createProgressStore(storage: Pick<Storage,'getItem'|'setItem'> | null): ProgressStore; // 키 'fundamentals-lab:v1'
  ```
- 완료 규칙: `done` = (sim 없음 또는 `sim===true`) 그리고 현재 장의 모든 문제 ID가 `answers`에 있음. 아무 기록도 없으면 `new`, 그 외 `in-progress`. `linksOnly` 장은 완료 판정 대상이 아니다(항상 `new`, 지도에서는 링크 칸 모양으로 표시). `course.yaml`의 `chapters`에는 콘텐츠가 있는 장만 넣고 Task 11에서 17장으로 확정한다.

- [ ] **Step 1: 실패 테스트** router: `parses course-chapter`, `unknown routes fall back to map`(`''`, `'#nope'`, `'#ebpf-99'`, `'#ebpf-05/x'`, `'#map'`), `round-trips toHash`.
- [ ] **Step 2: 실패 테스트** progress: `starts new`, `sim plus all answers is done`, `status ignores unknown ids`, `new question reopens chapter`, `survives throwing storage`(getItem/setItem이 throw), `resets corrupt json`, `persists across store instances`.
- [ ] **Step 3:** `npm test` → FAIL. 구현 → PASS.
- [ ] **Step 4:** Commit `feat: 해시 라우터와 진행도 저장소`.

---

### Task 4: 출처 검사 스크립트

**Files:**
- Create: `scripts/check-sources.ts`, `src/content/sources.ts`
- Test: `tests/content/sources.test.ts`

**Interfaces:**
- Consumes: `Course`, `loadCoursesFrom` (Task 2).
- Produces:
  ```ts
  interface RepoReader { exists(path: string): boolean; read(path: string): string }
  checkCourseSources(course: Course, repo: RepoReader): string[];   // 에러 목록
  ```
  CLI: `COURSE_SRC_EBPF=<로컬 clone> npm run check-sources` → `RepoReader`는 `git -C $src cat-file -e <sha>:<path>` / `git -C $src show <sha>:<path>`로 구현. 환경변수 없으면 에러로 종료(메시지에 변수 이름 안내).
- 규칙:
  1. 모든 `Source.path`가 고정 커밋에 존재.
  2. `Question.log`, `Option.log`, `Question.code`, `run.expect`의 **비어 있지 않은 각 줄(trim)**이 같은 항목(문제면 그 문제의 `sources`, run이면 `run.sources`) 출처 파일 중 하나에 부분 문자열로 존재. 생략 표시 줄 `...`은 제외.
  3. 시뮬레이션 데이터 중 문자열 필드 `log`·`code`가 있으면 `sim.sources` 기준으로 같은 검사(각 sim 모듈이 `quotedLines(data): string[]`를 export — Task 6~9에서 등록).

- [ ] **Step 1: 실패 테스트** (메모리 `RepoReader` 사용): `passes when all paths and lines exist`, `fails on missing path`, `fails when quoted line missing`(에러에 장·문제 ID와 줄 내용 포함), `ignores ellipsis lines`, `checks sim quoted lines`.
- [ ] **Step 2:** FAIL 확인 → 구현 → PASS.
- [ ] **Step 3:** 로컬 실행 확인: `COURSE_SRC_EBPF=/mnt/data/Y-jaehyun/ebpf-fundamentals-kr npm run check-sources` (콘텐츠 아직 없음 → `0 errors`).
- [ ] **Step 4:** Commit `feat: 콘텐츠 출처·인용 검사`.

---

### Task 5: 화면 틀 (테마·지도·장 화면·문제 풀이)

**Files:**
- Create: `src/ui/theme.css`, `src/ui/badges.ts`, `src/ui/quiz.ts`, `src/ui/order.ts`, `src/ui/map-view.ts`, `src/ui/chapter-view.ts`, `src/sims/registry.ts`
- Modify: `src/main.ts`, `index.html`
- Create (임시 확인용): `content/ebpf/course.yaml`, `content/ebpf/00.yaml` (00장 실제 문제 3개 — Task 10의 일부를 앞당겨 씀)
- Test: `tests/ui/quiz.test.ts`, `tests/ui/order.test.ts`, `tests/ui/chapter-view.test.ts`, `tests/ui/map-view.test.ts`

**Interfaces:**
- Consumes: Task 2·3 전부.
- Produces:
  ```ts
  // badges.ts
  measuredBadge(): HTMLElement;  estimatedBadge(): HTMLElement;  kernelNote(): HTMLElement; // "실측" / "추정치" / "kernel 6.17 기준"
  sourceList(course: Course, sources: Source[]): HTMLElement;  // `${repo}/blob/${sha}/${path}` 링크
  // quiz.ts
  renderQuestion(el: HTMLElement, q: Question, onCorrect: () => void): void;
  // order.ts
  renderOrder(el: HTMLElement, items: string[], onSolved: () => void): void; // 섞어 보여 주고 위/아래 버튼으로 이동, "확인" 시 판정
  // registry.ts
  interface SimContext { course: Course; chapter: Chapter; onComplete(): void }
  interface SimModule { kind: SimKind; validate(data: unknown): string[]; quotedLines(data: unknown): string[];
    mount(el: HTMLElement, data: unknown, ctx: SimContext): () => void }  // 반환값 = 정리 함수
  registerSim(m: SimModule): void;  getSim(kind: SimKind): SimModule | undefined;  simValidators(): Record<...>;
  // map-view.ts / chapter-view.ts
  renderMap(el: HTMLElement, courses: Course[], progress: ProgressStore): void;
  renderChapter(el: HTMLElement, course: Course, chapter: Chapter, progress: ProgressStore): () => void;
  ```
- `order` sim은 이 Task에서 `registry`에 등록(`data: { prompt: string; items: string[] }`, `mount`는 `renderOrder` 재사용).
- 장 화면: 상단 장 제목·요약, 세 단계 탭(만져 보기 / 문제 풀이 / 진짜로 돌려 보기). sim 없는 장은 첫 탭을 숨기고 문제 풀이로 시작. `linksOnly` 장은 "진짜로 돌려 보기"에 해당하는 링크 화면만. 진짜로 돌려 보기 탭: `run.cmd`(복사 버튼, clipboard 실패 시 텍스트 선택), `run.expect`(실측 배지), 장 README 링크 `${repo}/tree/${sha}/chapters/${slug}`.
- 오답 선택지: 빨강 표시 + `feedback`, `log`가 있으면 로그 블록(실측 배지)으로. 정답: 초록 + `feedback` + `onCorrect`.
- 지도: 코스별 트랙, 장 칸 = 상태 3색(`new`/`in-progress`/`done`) + 클릭 시 `#course-chapter`. 디자인 방향은 목업(실험실 계기판 톤, Do Hyeon/IBM Plex Sans KR/JetBrains Mono)을 참고하되 빌더 재량.

- [ ] **Step 1: 실패 테스트**:
  - quiz: `correct option calls onCorrect once and shows feedback`, `wrong option shows feedback and log with measured badge`, `options are buttons reachable by keyboard`(모두 `<button>`).
  - order: `solves when items reordered to answer`, `does not solve on wrong order`, `initial order differs from answer`(항목 2개 이상일 때).
  - chapter-view: `hides sim tab when chapter has no sim`, `marks progress when quiz answered`, `run tab links to pinned sha`.
  - map-view: `renders one cell per chapter with status class`, `cell href is chapter hash`.
  - `wide blocks scroll inside container`: `theme.css` 문자열에 `pre`·`.lanes`·`.timeline`에 대한 `overflow-x: auto` 규칙이 있는지 검사.
- [ ] **Step 2:** FAIL → 구현 → PASS. `main.ts`: `loadCourses(simValidators())` → `hashchange`마다 이전 화면 정리 함수 호출 후 렌더. `prefers-reduced-motion`은 CSS와 `matchMedia` 둘 다 반영.
- [ ] **Step 3:** 00장 콘텐츠(`content/ebpf/00.yaml`): 문제 3개, 출처 `chapters/00-setup/README.md` 등. `npm test && COURSE_SRC_EBPF=... npm run check-sources` PASS.
- [ ] **Step 4:** `npm run dev`로 띄워 지도 → 00장 → 문제 풀이 → 새로고침 후 진행도 유지까지 수동 확인(라이트·다크·400px).
- [ ] **Step 5:** Commit `feat: 지도·장 화면·문제 풀이 틀과 00장`.

---

### Task 6: Verifier 퍼즐 (05장)

**Files:**
- Create: `src/sims/verifier/model.ts`, `src/sims/verifier/view.ts`, `content/ebpf/05.yaml`
- Modify: `src/main.ts`(등록 import)
- Test: `tests/sims/verifier.test.ts`

**Interfaces:**
- Consumes: `SimModule`, `registerSim`, `badges` (Task 5).
- Produces: `data` 형식
  ```ts
  interface VerifierCase { id: string; title: string; code: string; badLog: string; goodLog: string;
    options: { text: string; correct?: boolean; feedback: string; log?: string }[] }
  interface VerifierData { cases: VerifierCase[] }
  ```
  `model.ts`: `validateVerifier(d): string[]`(케이스 ≥3, 케이스마다 정답 1개), `nextState(state, caseId, optionIndex): { solved: Set<string>; lastResult: 'pass'|'reject' }`, `isComplete(state, data): boolean`(전 케이스 해결).
- 화면: 목업의 Verifier 퍼즐과 같은 흐름. 정답 시 `goodLog`(실측 배지)와 단계 표시 `clang 빌드 → verifier → JIT → attach` 점등. 오답 시 `option.log`가 있으면 "커널이 이번엔 이렇게 말해요"로 표시, 없으면 `feedback`만.
- 콘텐츠 근거: `chapters/05-verifier/code/cases/*`(코드), `chapters/05-verifier/code/out/0N-*.bad.log`·`*.good.log`(로그), `chapters/05-verifier/README.md`(설명), 그리고 `chapters/01-big-picture/code/bad-license.bpf.c`·`out/bad-license.log`. 최소 5케이스(01 null-check, 02 bounds, 03 uninit-stack, 06 ctx-write, 라이선스). **에러 문구는 반드시 로그에서 그대로** 가져온다(예: 02는 `math between map_value pointer and register with unbounded min value is not allowed` — 목업 문구와 다름). 오답 `log`는 저장소에 실측이 있는 경우만.
- 05장 문제 풀이(3~5문제)는 퍼즐과 겹치지 않게 verifier 한도·원리(README 근거).

- [ ] **Step 1: 실패 테스트**: `rejects data with fewer than 3 cases`, `wrong option keeps case unsolved`, `complete when all cases solved`, `quotedLines returns code, badLog, goodLog and option logs`.
- [ ] **Step 2:** FAIL → 구현 → PASS.
- [ ] **Step 3:** `content/ebpf/05.yaml` 작성 → `npm test && COURSE_SRC_EBPF=... npm run check-sources` PASS.
- [ ] **Step 4:** 브라우저 수동 확인 후 Commit `feat(ebpf-05): verifier 퍼즐`.

---

### Task 7: hook 고르기 미션 (10·11장)

**Files:**
- Create: `src/sims/hook-picker/model.ts`, `src/sims/hook-picker/view.ts`, `content/ebpf/10.yaml`, `content/ebpf/11.yaml`
- Test: `tests/sims/hook-picker.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type HookId = 'xdp' | 'tc-ingress' | 'netfilter' | 'socket-filter' | 'cgroup-connect4' | 'cgroup-sendmsg4' | 'tc-egress';
  interface Outcome { text: string; measured?: string }   // measured = 실측 수치 문자열(예: '시간 초과, 2.5s') — 출처 로그에 그대로 있어야 함
  interface Mission { id: string; prompt: string; answer: HookId; outcomes: Partial<Record<HookId, Outcome>> }
  interface HookPickerData { missions: Mission[]; hooks: HookId[] }   // hooks = 이 장에서 고를 수 있는 hook
  ```
  `model.ts`: `validateHookPicker(d)`(answer가 hooks에 있고 outcomes에 answer 포함, hooks의 모든 항목에 outcome 존재), `pick(state, missionId, hook): { correct: boolean; outcome: Outcome }`, `isComplete(state, data)`(모든 미션 1회 이상 정답), `quotedLines(d)` = 모든 `measured`.
- 레인: 수신(NIC → XDP → TC ingress → netfilter → 소켓 → 앱), 송신(앱 → cgroup connect4/sendmsg4 → 소켓 → TC egress → NIC). 장에 없는 hook은 비활성 점선. 패킷 점이 선택 hook까지 이동(reduced-motion이면 즉시).
- 콘텐츠 근거:
  - 10장: `chapters/10-xdp-afxdp/code/out/run.log`(차단 전·후 ping 손실률, AF_XDP로 UDP :9000만 사용자 공간 수신), README.
  - 11장: `chapters/11-tc-cgroup/code/out/run.log` — TC egress 차단은 `실패: 시간 초과, 2.5s`(SYN 재전송 +1.022s 등), cgroup connect4는 `operation not permitted (EPERM), 159.4µs`, :80→:8081 redirect. 재전송 간격에는 kernel 6.17 기준 표시.
  - 목업의 netfilter conntrack 미션처럼 저장소 근거가 없는 미션은 넣지 않는다.

- [ ] **Step 1: 실패 테스트**: `validator requires outcome for every offered hook`, `pick returns outcome and correctness`, `complete after each mission answered correctly once`, `quotedLines lists measured strings`.
- [ ] **Step 2:** FAIL → 구현 → PASS.
- [ ] **Step 3:** 10·11장 YAML(각 미션 2개 이상 + 문제 3~5개) → `npm test && check-sources` PASS.
- [ ] **Step 4:** 수동 확인 후 Commit `feat(ebpf-10,11): hook 고르기 미션`.

---

### Task 8: 패킷 타임라인 (09장)

**Files:**
- Create: `src/sims/packet-timeline/model.ts`, `src/sims/packet-timeline/view.ts`, `content/ebpf/09.yaml`
- Test: `tests/sims/packet-timeline.test.ts`

**Interfaces:**
- Produces:
  ```ts
  const STAGES = ['XDP','TC','ip_rcv_core','NF_PRE','NF_IN','udp_rcv','socket','app'] as const;
  interface Scenario { id: string; label: string; dropAt: typeof STAGES[number] | null;
    medianUs: Partial<Record<typeof STAGES[number], number>>; received: string; log: string }
  interface PacketTimelineData { scenarios: Scenario[] }
  ```
  `model.ts`: `validateTimeline(d)`(dropAt 이후 단계에 medianUs 없음), `reachedStages(s): string[]`, `isComplete(viewed: Set<string>, d)`(모든 시나리오 1회 이상 재생), `quotedLines(d)` = 각 `log`(해당 시나리오의 `중앙` 줄 + `앱이 받은 패킷:` 줄).
- **전부 실측 재생**(추정 없음). 화면: 시나리오 버튼(버리지 않음 / XDP / TC / netfilter / 소켓 필터), 패킷이 단계를 지나며 각 단계 중앙값 µs 표시, 버려진 이후 단계는 `-`. 실측 배지 + kernel 6.17 기준.
- 근거: `chapters/09-packet-path/code/out/run.log`의 시나리오 1~5(6번 IP 계층 진입 비교는 문제 풀이로).

- [ ] **Step 1: 실패 테스트**: `rejects median after drop stage`, `reachedStages stops at dropAt`, `complete after viewing every scenario`.
- [ ] **Step 2:** FAIL → 구현 → PASS.
- [ ] **Step 3:** 09장 YAML → `npm test && check-sources` PASS.
- [ ] **Step 4:** 수동 확인 후 Commit `feat(ebpf-09): 패킷 경로 타임라인`.

---

### Task 9: 버퍼 유실 시뮬레이션 (04장)

**Files:**
- Create: `src/sims/buffer-loss/model.ts`, `src/sims/buffer-loss/view.ts`, `content/ebpf/04.yaml`
- Test: `tests/sims/buffer-loss.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Method = 'map' | 'ringbuf-reserve' | 'ringbuf-output' | 'perf';
  interface Anchor { buffer: 'default' | 'small'; delayUs: number; lost: Record<Method, number>; total: number; log: string }
  interface BufferLossData { anchors: Anchor[] }
  estimateLoss(d: BufferLossData, buffer: 'default'|'small', delayUs: number, m: Method): { lost: number; measured: boolean };
  delayRange(d, buffer): [number, number] | null;   // 그 버퍼의 실측 지연 최소~최대, 실측점 1개면 null(슬라이더 비활성)
  ```
- 모델: 같은 버퍼의 실측점 사이 **선형 보간**, 실측점과 정확히 같으면 `measured: true`. 범위 밖 입력은 범위로 자른다. 모델 식과 기준값 출처를 `model.ts` 상단 주석에 남긴다.
- 기준점(`chapters/04-maps/code/out/run.log`): 기본 버퍼·지연 0 → 유실 전부 0 / 작은 버퍼·지연 0 → reserve 704, output 293, perf 7603 / 작은 버퍼·지연 2µs → reserve 285845, output 264763, perf 1768 (총 500000).
- 화면: 버퍼 선택(기본 CPU당 64KB / 작은 4KB), 소비자 지연 슬라이더(작은 버퍼만 0~2µs), 방식별 받은 수·유실 막대. 실측점이면 "실측", 아니면 "추정치". "느린 소비자에선 ring buffer가 perf buffer보다 훨씬 많이 잃는다"는 질적 결론은 실측점에서만 문구로 표시. 완료 조건: 실측점 3곳을 모두 한 번씩 본다.

- [ ] **Step 1: 실패 테스트**: `returns measured at anchors`, `interpolates between small-buffer anchors and flags estimated`(1µs에서 perf = (7603+1768)/2 근처, `measured:false`), `clamps outside measured range`, `delayRange null for default buffer`.
- [ ] **Step 2:** FAIL → 구현 → PASS.
- [ ] **Step 3:** 04장 YAML(anchor `log`는 run.log 표의 해당 줄 그대로) → `npm test && check-sources` PASS.
- [ ] **Step 4:** 수동 확인 후 Commit `feat(ebpf-04): ring/perf 버퍼 유실 시뮬레이션`.

---

### Task 10: 01장 순서 맞추기 + 나머지 장 문제 풀이 (1부)

**Files:**
- Create: `content/ebpf/01.yaml`(sim `order`: 소스 → clang → verifier → JIT → hook attach → map → 사용자 공간), `02.yaml`, `03.yaml`, `06.yaml`, `07.yaml`, `08.yaml`
- Modify: `content/ebpf/course.yaml`

- [ ] **Step 1:** 장마다 3~5문제. 각 문제는 그 장 README·`out/` 파일만 근거로. 01장은 `bad-null`·`bad-license` 로그도 활용 가능(05장 퍼즐과 중복 피하기).
- [ ] **Step 2:** `npm test && COURSE_SRC_EBPF=... npm run check-sources` PASS.
- [ ] **Step 3:** Commit `content(ebpf): 01·02·03·06·07·08장`.

### Task 11: 나머지 장 문제 풀이 (2부)

**Files:**
- Create: `content/ebpf/12.yaml`, `13.yaml`, `14.yaml`, `15.yaml`(`linksOnly: true`), `a.yaml`
- Modify: `content/ebpf/course.yaml`(전체 17장 순서 확정: 00~15, a)

- [ ] **Step 1:** 장마다 3~5문제(15장 제외). 부록 A는 "몇 버전부터?" 문제, kernel 기능표 근거.
- [ ] **Step 2:** 테스트 추가 `tests/content/ebpf.test.ts`: `ebpf course has 17 chapters in README order`, `every chapter except 15 has 3..5 questions`, `sims present for 01,04,05,09,10,11`.
- [ ] **Step 3:** `npm test && check-sources` PASS.
- [ ] **Step 4:** Commit `content(ebpf): 12·13·14·15·A장`.

---

### Task 12: CI·배포·마무리

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`

**Interfaces:**
- 워크플로: push to `main` → `npm ci` → `npm run typecheck` → `npm test` → `actions/checkout`로 `Y-JaeHyun/ebpf-fundamentals-kr`를 `ref: <고정 sha>`, `fetch-depth: 0`, `path: .course-src/ebpf` → `COURSE_SRC_EBPF=.course-src/ebpf npm run check-sources` → `npm run build` → `actions/upload-pages-artifact`(dist) → `actions/deploy-pages`. PR에서는 배포 단계 제외.

- [ ] **Step 1:** 워크플로 작성. `README.md`: 소개, 화면 구성(세 단계), 실측/추정 원칙, 콘텐츠 추가 방법(YAML 예시 한 개 + 검사 명령), 라이선스.
- [ ] **Step 2:** 로컬 최종 확인: `npm run typecheck && npm test && COURSE_SRC_EBPF=/mnt/data/Y-jaehyun/ebpf-fundamentals-kr npm run check-sources && npm run build` 모두 성공. `npx vite preview`로 수동 점검: 라이트·다크, 400px 폭 가로 스크롤 없음(코드·레인·타임라인), 키보드로 전 단계 진행, reduced-motion, 사생활 보호 창에서 동작.
- [ ] **Step 3:** 공개 전 점검: `git grep -nE '/mnt/data|whatap|wogus|ATATT'` 결과 없음.
- [ ] **Step 4:** Commit `ci: 테스트·출처 검사·Pages 배포`.
- [ ] **Step 5 (사용자 승인 필요 — 여기서 멈추고 묻는다):** `gh repo create Y-JaeHyun/fundamentals-lab --public` → push → 저장소 Settings에서 Pages 소스를 GitHub Actions로 → 배포 URL 확인. 이후 별도 승인으로 `ebpf-fundamentals-kr` 각 장 README에 랩 링크 한 줄 추가.
