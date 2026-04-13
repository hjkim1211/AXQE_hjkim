// ══════════════════════════════════════════
// Webhook 시뮬레이터 탭 — 렌더링 & 이벤트
// ══════════════════════════════════════════

const W_ST_CLASS = { complete: 'w-st-complete', progress: 'w-st-progress', delay: 'w-st-delay', missing: 'w-st-missing' };
const W_ST_LABEL = { complete: '완료', progress: '진행중', delay: '지연', missing: '산출물 미비' };

// ── 미니 대시보드 렌더 ─────────────────────
function renderWebhookDash(flashId = null) {
  const total   = agents.length;
  const done    = agents.filter(a => calcStatus(a) === 'complete').length;
  const delay   = agents.filter(a => calcStatus(a) === 'delay').length;
  const missing = agents.filter(a => calcStatus(a) === 'missing').length;

  document.getElementById('w-kpi-total').textContent   = total;
  document.getElementById('w-kpi-rate').textContent    = Math.round(done / total * 100) + '%';
  document.getElementById('w-kpi-delay').textContent   = delay;
  document.getElementById('w-kpi-missing').textContent = missing;
  document.getElementById('w-sync-time').textContent   = '↻ ' + new Date().toLocaleTimeString('ko-KR');

  document.getElementById('w-agentRows').innerHTML = agents.map(a => {
    const prog = calcProgress(a.phases);
    const st   = calcStatus(a);
    const dots = a.phases.map((p, i) =>
      `<span class="w-phase-dot ${p} ${flashId === a.id ? 'pop' : ''}" title="${PHASES[i]}">${PHASE_SHORT[i]}</span>`
    ).join('');
    const artChips = ARTIFACTS.map(art =>
      `<span class="w-art-chip ${a.artifacts[art] === 'y' ? 'w-art-y' : 'w-art-n'}">${ART_LABELS[art]}</span>`
    ).join('');
    return `<div class="w-agent-row ${flashId === a.id ? 'w-flash' : ''}">
      <span class="w-agent-id">${a.id}</span>
      <div><div class="w-agent-name">${a.name}</div><div style="margin-top:2px;">${artChips}</div></div>
      <span class="w-agent-owner">${a.owner}</span>
      <div>${dots}</div>
      <div>
        <div class="w-prog-track"><div class="w-prog-fill" style="width:${prog}%"></div></div>
        <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#8b949e;">${prog}%</span>
      </div>
      <span class="w-status-chip ${W_ST_CLASS[st]}">${W_ST_LABEL[st]}</span>
    </div>`;
  }).join('');

  // Agent 선택 셀렉트 업데이트
  ['commit-agent', 'ci-agent'].forEach(id => {
    const sel = document.getElementById(id);
    const cur = sel.value;
    sel.innerHTML = '<option value="">Agent 선택...</option>' +
      agents.map(a => `<option value="${a.id}" ${a.id === cur ? 'selected' : ''}>${a.id} · ${a.name}</option>`).join('');
  });
}

// ── 브랜치명 파싱 미리보기 ─────────────────
function parseBranch(val, targetId) {
  const el = document.getElementById(targetId);
  if (!val) { el.innerHTML = '브랜치명 입력 시 Agent ID 자동 감지'; return; }
  const id = parseAgentId(val);
  if (id) {
    const a = agents.find(ag => ag.id === id);
    el.innerHTML = a
      ? `감지: <span class="ok">${id}</span> · ${a.name}`
      : `<span class="ng">${id} — 미등록 Agent</span>`;
  } else {
    el.innerHTML = `<span class="ng">Agent ID 미감지 — 브랜치명에 AGT-XXX 필요</span>`;
  }
}

// ── 이벤트 로그 ────────────────────────────
let logCount = 0;

function addLog(type, event, detail) {
  const list = document.getElementById('w-logList');
  if (list.querySelector('.w-log-empty')) list.innerHTML = '';
  document.getElementById('nav-log-count').textContent = `${++logCount} event${logCount > 1 ? 's' : ''}`;
  const item = document.createElement('div');
  item.className = `w-log-item ev-${type}`;
  item.innerHTML = `
    <span class="w-log-time">${new Date().toLocaleTimeString('ko-KR')}</span>
    <div>
      <div class="w-log-event">${event}</div>
      <div class="w-log-detail">${detail}</div>
    </div>`;
  list.prepend(item);
}

// ── Webhook 이벤트 핸들러 ──────────────────

/**
 * PR Merge 이벤트
 * 브랜치명에서 Agent ID 감지 → 개발 단계 완료 처리
 */
function firePRMerge() {
  const branch  = document.getElementById('pr-branch').value.trim() || 'feature/AGT-001-상담요약';
  const title   = document.getElementById('pr-title').value.trim()  || 'feat: 개발 완료';
  const author  = document.getElementById('pr-author').value.trim() || 'developer';
  const agentId = parseAgentId(branch);

  if (!agentId) {
    addLog('err', '⚠ Agent ID 미감지',
      `브랜치 "${branch}"에서 AGT-XXX 패턴 없음\n→ 브랜치 명명 규칙 확인 필요`);
    return;
  }
  const agent = agents.find(a => a.id === agentId);
  if (!agent) {
    addLog('err', '⚠ 미등록 Agent', `${agentId}는 등록되지 않은 Agent`);
    return;
  }

  // 개발(index 2) 완료, 테스트(index 3) 진행중으로 전환
  agent.phases[2] = 'done';
  if (agent.phases[3] === 'pending') agent.phases[3] = 'current';
  agent.status = 'progress';

  addLog('pr', '✅ PR Merge → 개발 완료',
    `${agentId} · ${agent.name}\n브랜치: ${branch} · 작성자: ${author}\n→ 개발 단계 자동 완료`);

  renderWebhookDash(agentId);
  renderDashboard(agentId);
}

/**
 * 파일 커밋 이벤트
 * 파일 경로 키워드로 산출물 종류 자동 감지 → 산출물 등록
 */
function fireCommit() {
  const agentId  = document.getElementById('commit-agent').value;
  const filePath = document.getElementById('commit-file').value.trim();

  if (!agentId)  { alert('Agent를 선택해주세요.'); return; }
  if (!filePath) { alert('파일 경로를 입력해주세요.'); return; }

  const agent    = agents.find(a => a.id === agentId);
  const fp       = filePath.toLowerCase();
  const detected = [];

  if (fp.includes('tc') || fp.includes('테스트케이스') || fp.includes('test'))          { agent.artifacts.tc     = 'y'; detected.push('TC'); }
  if (fp.includes('req') || fp.includes('요구사항') || fp.includes('requirement'))      { agent.artifacts.req    = 'y'; detected.push('요구사항'); }
  if (fp.includes('설계') || fp.includes('design') || fp.includes('architecture'))      { agent.artifacts.design = 'y'; detected.push('설계서'); }
  if (fp.includes('결과') || fp.includes('report') || fp.includes('보고'))              { agent.artifacts.report = 'y'; detected.push('결과보고서'); }

  if (detected.length === 0) {
    addLog('commit', '📄 파일 커밋',
      `${agentId} · ${filePath}\n→ 산출물 유형 미분류 (TC/요구사항/설계/결과 키워드 필요)`);
  } else {
    addLog('commit', '📄 산출물 자동 등록',
      `${agentId} · ${agent.name}\n파일: ${filePath}\n→ ${detected.join(', ')} 등록 완료`);
  }

  renderWebhookDash(agentId);
  renderDashboard(agentId);
}

/**
 * CI/CD 이벤트
 * success → 테스트 단계 완료 / failure → 상태 유지
 */
function fireCI() {
  const agentId = document.getElementById('ci-agent').value;
  const result  = document.getElementById('ci-result').value;

  if (!agentId) { alert('Agent를 선택해주세요.'); return; }

  const agent = agents.find(a => a.id === agentId);

  if (result === 'success') {
    agent.phases[3] = 'done';
    agent.phases[4] = 'current';
    addLog('ci', '⚡ CI 통과 → 테스트 완료',
      `${agentId} · ${agent.name}\n→ 테스트 단계 자동 완료`);
  } else {
    addLog('ci', '⚡ CI 실패',
      `${agentId} · ${agent.name}\n→ 상태 변경 없음 (재실행 필요)`);
  }

  renderWebhookDash(agentId);
  renderDashboard(agentId);
}

// ── 빠른 시나리오 ──────────────────────────
function fireScenario(type) {
  if (type === 'pr_merge') {
    document.getElementById('pr-branch').value = 'feature/AGT-001-상담요약';
    document.getElementById('pr-title').value  = 'feat: 상담요약 Agent 개발 완료';
    document.getElementById('pr-author').value = 'developer-kim';
    parseBranch('feature/AGT-001-상담요약', 'pr-detect');
    firePRMerge();
  } else if (type === 'doc_commit') {
    document.getElementById('commit-agent').value = 'AGT-002';
    document.getElementById('commit-file').value  = 'AGT-002/docs/TC.xlsx';
    fireCommit();
  } else if (type === 'ci_pass') {
    document.getElementById('ci-agent').value  = 'AGT-003';
    document.getElementById('ci-result').value = 'success';
    fireCI();
  } else if (type === 'no_id') {
    document.getElementById('pr-branch').value = 'feature/fix-chatbot-bug';
    document.getElementById('pr-title').value  = 'fix: 챗봇 버그 수정';
    document.getElementById('pr-author').value = 'developer-lee';
    parseBranch('feature/fix-chatbot-bug', 'pr-detect');
    firePRMerge();
  }
}
