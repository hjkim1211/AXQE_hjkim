# AX Agent Quality Hub

> AX 프로젝트의 AI Agent 품질을 관리하는 대시보드 + GitHub Webhook 시뮬레이터

## 📸 주요 기능

### 📊 Quality Dashboard
- Agent별 단계 진행 현황 (기획 → 설계 → 개발 → 테스트 → 완료)
- KPI 요약: 전체 완료율, 지연 Agent, 산출물 미비 Agent
- 단계별 분포 차트 및 위험 Agent 즉시 하이라이트
- 상태/단계 필터, 검색, 페이지네이션
- Agent 직접 추가/수정 및 CSV 업로드/내보내기

### ⚡ GitHub Webhook 시뮬레이터
- PR Merge → 개발 단계 자동 완료
- `docs/` 폴더 파일 커밋 → 산출물(TC, 요구사항, 설계서, 결과보고서) 자동 등록
- CI/CD 통과 → 테스트 단계 자동 완료
- 브랜치명에서 `AGT-XXX` 패턴으로 Agent ID 자동 감지
- 실시간 이벤트 로그

> 두 탭이 동일한 데이터를 공유 — Webhook 이벤트 발생 시 Dashboard도 즉시 반영

---

## 🗂 파일 구조

```
ax-quality-hub/
├── index.html          # 메인 HTML (탭 네비게이션 + UI 구조)
├── css/
│   └── main.css        # 전체 스타일 (탭 공통 + 대시보드 + Webhook)
├── js/
│   ├── data.js         # 공유 데이터 (agents 배열) + 공통 유틸 함수
│   ├── dashboard.js    # 대시보드 탭 렌더링 및 인터랙션
│   └── webhook.js      # Webhook 시뮬레이터 렌더링 및 이벤트 처리
└── README.md
```

---

## 🚀 실행 방법

### 로컬에서 바로 열기
```bash
# index.html을 브라우저에서 직접 열면 됩니다
open index.html
```

### GitHub Pages로 배포
1. 이 저장소를 Fork 또는 Clone
2. Settings → Pages → Source: `main` 브랜치, `/ (root)` 선택
3. 저장하면 `https://{username}.github.io/{repo-name}` 으로 접근 가능

---

## 📋 데이터 입력 방법

### 방법 1: CSV 업로드
Dashboard 탭 → `+ Agent 추가` → `CSV 업로드` 탭에서 파일 선택

**CSV 형식:**
```csv
id,name,owner,due,p1,p2,p3,p4,p5,tc,req,design,report,status
AGT-001,상담요약Agent,홍길동,2025-06-30,done,done,current,pending,pending,y,y,n,n,progress
AGT-002,FAQ Agent,김철수,2025-07-15,done,done,done,done,done,y,y,y,y,complete
```

| 컬럼 | 값 |
|------|-----|
| p1~p5 | `done` / `current` / `pending` |
| tc, req, design, report | `y` / `n` |
| status | `progress` / `complete` / `delay` / `missing` |

### 방법 2: 직접 입력
Dashboard 탭 → `+ Agent 추가` 버튼

### 방법 3: data.js 수정
`js/data.js`의 `agents` 배열을 직접 편집

---

## ⚡ Webhook 자동화 규칙

| GitHub 이벤트 | 브랜치/경로 조건 | 대시보드 반영 |
|---|---|---|
| PR Merge (→ main) | 브랜치명에 `AGT-XXX` 포함 | 개발 단계 완료 |
| 파일 커밋 | `docs/TC*`, `docs/요구사항*` 등 | 해당 산출물 등록 |
| CI/CD 완료 | `success` | 테스트 단계 완료 |

**브랜치 명명 규칙 (팀 컨벤션으로 정의 권장):**
```
feature/AGT-001-상담요약
feat/AGT-002-faq-agent
fix/AGT-003-contract-review
```

---

## 🛠 실제 GitHub Webhook 연동 (추후 확장)

현재는 시뮬레이터이지만, 실제 연동 시:
1. GitHub 저장소 → Settings → Webhooks → Add webhook
2. Payload URL: 백엔드 서버 엔드포인트
3. Content type: `application/json`
4. Events: `Pull requests`, `Pushes`, `Workflow runs`

백엔드에서 payload를 파싱해 `data.js`의 agents 데이터를 업데이트하면 됩니다.

---

## 📝 배경

이 프로젝트는 AX QE팀 세미나 발표 자료로 제작되었습니다.

> "170개 Agent, QE 혼자 어떻게 봐? — 대규모 AX 프로젝트의 품질 가시성 문제"

세 번의 삽질(엑셀 수동 취합 → 보고 양식 배포 → 산출물 체크리스트) 끝에 도달한
**"데이터 수집을 프로세스에 심어야 한다"** 는 인사이트를 담고 있습니다.
