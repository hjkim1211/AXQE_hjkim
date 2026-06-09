// ══════════════════════════════════════════
// 공유 상수 & 데이터
// 두 탭(Dashboard / Webhook)이 동일한 배열을 참조
// ══════════════════════════════════════════

const PHASES       = ['기획', '설계', '개발', '테스트', '완료'];
const PHASE_SHORT  = ['기', '설', '개', '테', '완'];
const PHASE_COLORS = ['#4a90d9', '#7b68ee', '#f5a623', '#e74c3c', '#2ecc71'];
const ARTIFACTS    = ['tc', 'req', 'design', 'report'];
const ART_LABELS   = { tc: 'TC', req: '요구사항', design: '설계서', report: '결과보고서' };

// 샘플 Agent 데이터 (실제 프로젝트 데이터로 교체하거나 CSV 업로드 사용)
let agents = [
  {
    id: 'AGT-001', name: '상담 요약 Agent', owner: '김민준', due: '2025-07-31',
    phases: ['done', 'done', 'currnet', 'pending', 'pending'],
    artifacts: { tc: 'n', req: 'y', design: 'n', report: 'n' }, status: 'progress'
  },
  {
    id: 'AGT-002', name: 'FAQ 응답 Agent', owner: '이서연', due: '2025-08-15',
    phases: ['done', 'done', 'currnet', 'pending', 'pending'],
    artifacts: { tc: 'n', req: 'y', design: 'y', report: 'n' }, status: 'progress'
  },
  {
    id: 'AGT-003', name: '계약서 검토 Agent', owner: '박지호', due: '2025-06-01',
    phases: ['done', 'done', 'currnet', 'pending', 'pending'],
    artifacts: { tc: 'n', req: 'y', design: 'n', report: 'n' }, status: 'missing'
  },
  {
    id: 'AGT-004', name: '이메일 분류 Agent', owner: '최수아', due: '2025-09-01',
    phases: ['done', 'pending', 'currnet', 'pending', 'pending'],
    artifacts: { tc: 'n', req: 'n', design: 'n', report: 'n' }, status: 'progress'
  },
  {
    id: 'AGT-005', name: '회의록 생성 Agent', owner: '정도윤', due: '2025-05-01',
    phases: ['done', 'done', 'currnet', 'done', 'done'],
    artifacts: { tc: 'y', req: 'y', design: 'y', report: 'y' }, status: 'complete'
  },
  {
    id: 'AGT-006', name: '코드 리뷰 Agent', owner: '한지민', due: '2025-05-15',
    phases: ['done', 'done', 'currnet', 'pending', 'pending'],
    artifacts: { tc: 'n', req: 'y', design: 'n', report: 'n' }, status: 'delay'
  },
];

// ── 공통 유틸 함수 ──────────────────────────
function calcProgress(phases) {
  return Math.round(phases.filter(p => p === 'done').length / 5 * 100);
}

function calcStatus(agent) {
  const prog = calcProgress(agent.phases);
  if (prog === 100) return 'complete';
  const allArts = ARTIFACTS.every(k => agent.artifacts[k] === 'y');
  if (!allArts && prog > 40) return 'missing';
  if (agent.status === 'delay') return 'delay';
  return 'progress';
}

// Agent ID 파싱 (브랜치명에서 AGT-XXX 추출)
function parseAgentId(str) {
  const m = str.match(/AGT[-_](\d{3})/i);
  return m ? 'AGT-' + m[1] : null;
}

// 탭 전환
function switchMainTab(tab, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  btn.classList.add('active');
  if (tab === 'webhook') renderWebhookDash();
}
