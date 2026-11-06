# 기초체력 랩

읽기 전에 먼저 손으로 만져 보는 학습 사이트입니다. 코스 저장소의 장 하나를 세 단계로 깹니다.

| 단계 | 시간 | 하는 일 |
|---|---|---|
| 만져 보기 | 5분 | 브라우저 안 시뮬레이션. 직접 조작하다가 깨져 보는 게 목적 |
| 문제 풀이 | 5분 | 실제 에러 메시지·실행 결과를 보고 원인과 해결을 고르는 3~5문제 |
| 진짜로 돌려 보기 | 선택 | 같은 상황을 내 리눅스에서 재현하는 명령어와 코스 저장소 링크 |

순서는 추천일 뿐 잠그지 않습니다. 진행도는 각자 브라우저(localStorage)에만 저장됩니다.

## 코스

| 코스 | 저장소 | 상태 |
|---|---|---|
| eBPF 기초 체력 | [ebpf-fundamentals-kr](https://github.com/Y-JaeHyun/ebpf-fundamentals-kr) | 17장 전체 문제, 시뮬레이션 6개(01·04·05·09·10·11) |
| 로봇 시스템 기초 체력 | [robotics-fundamentals-kr](https://github.com/Y-JaeHyun/robotics-fundamentals-kr) | 17장 전체 문제, 시뮬레이션: 10 ROS2 토픽 배선(타입·QoS 불일치) |

## 실측과 추정

시뮬레이션이 실제와 다르면 실패라는 원칙을 지킵니다.

- **질적 결과는 실측만**: 통과/거부, 에러 메시지, EPERM vs 타임아웃처럼 결론에 해당하는 결과는 코스 저장소에서 실제로 실행해 README에 실은 결과만 씁니다. 화면에 **실측** 배지가 붙습니다.
- **수치는 실측점 기반 추정 허용**: 슬라이더로 바꾸는 수치는 실측점 사이를 단순 모델로 계산할 수 있고, 그때는 **추정치** 배지가 붙습니다. 실측 범위 밖으로는 움직일 수 없습니다.
- `npm run check-sources`가 콘텐츠의 모든 출처 경로와 인용한 로그·코드 줄이 코스 저장소의 **고정 커밋**에 그대로 있는지 확인합니다. CI에서도 돕니다.

## GitHub Pages 설정

처음 한 번, 저장소 Settings → Pages의 Source를 **GitHub Actions**로 둡니다. 이후 `main`에 push하면 테스트·출처 검사·빌드를 통과한 경우에만 배포됩니다.

## 개발

```bash
npm ci
npm run dev                 # 로컬 서버
npm test                    # 단위 테스트 (Vitest)
npm run typecheck
COURSE_SRC_EBPF=../ebpf-fundamentals-kr COURSE_SRC_ROBOTICS=../robotics-fundamentals-kr npm run check-sources   # 출처 검사
npm run build               # dist/ (GitHub Pages로 배포)
```

## 콘텐츠 추가

장 하나는 `content/<코스>/<장 id>.yaml` 파일 하나이고, `content/<코스>/course.yaml`의 `chapters` 목록에 등록합니다.

```yaml
id: '05'
slug: 05-verifier            # 코스 저장소의 chapters/ 디렉터리 이름
title: Verifier
summary: 120자 이내 요약
sim:                          # 선택. 종류: order, verifier, hook-picker, packet-timeline, buffer-loss, topic-wiring
  kind: verifier
  data: { ... }
  sources: [{ path: chapters/05-verifier/README.md }]
questions:                    # 3~5개
  - id: read-log
    kind: choice              # 또는 order
    prompt: 질문
    log: |                    # 선택. 출처 파일에 한 줄 한 줄 그대로 있어야 함
      R0 invalid mem access 'map_value_or_null'
    options:                  # 2~4개, 정답은 정확히 1개
      - text: 보기
        correct: true
        feedback: 300자 이내 설명
    sources: [{ path: chapters/05-verifier/README.md }]
run:
  cmd: make -C chapters/05-verifier/code build run
  sources: [{ path: chapters/05-verifier/README.md }]
```

새 시뮬레이션 종류는 `src/sims/<종류>/model.ts`(검증·인용 줄, DOM 없음)와 `view.ts`(화면)를 만들고 `src/sims/node-registry.ts`, `src/sims/registry.ts`에 등록합니다.

## 라이선스

- 코드: [MIT](LICENSE)
- `content/`(문제·설명): [CC BY-SA 4.0](LICENSE-content). 코스 저장소 README를 요약·인용하며, 각 문제에 원문 경로를 출처로 표기합니다.
