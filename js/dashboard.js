// ══════════════════════════════════════════
// Dashboard 탭 — 렌더링 & 인터랙션
// ══════════════════════════════════════════

const D_ST_CLASS = { complete: 'd-st-complete', progress: 'd-st-progress', delay: 'd-st-delay', missing: 'd-st-missing' };
const D_ST_LABEL = { complete: '완료', progress: '진행중', delay: '지연', missing: '산출물 미비' };

let currentView = 'all';
let currentPhaseView = null;
let sortKey = null;
let sortAsc = true;
let currentPage = 1;
const PAGE_SIZE = 10;

// ── 필터 & 정렬 ────────────────────────────
function getFiltered() {
  let list = [...agents];

  if (currentView !== 'all') list = list.filter(a => calcStatus(a) === currentView);
  if (currentPhaseView) {
    const pi = PHASES.indexOf(currentPhaseView);
    list = list.filter(a => a.phases[pi] === 'current');
  }

  const q = document.getElementById('searchInput').value.toLowerCase();
  if (q) list = list.filter(a => a.name.toLowerCase().includes(q) || a.owner.toLowerCase().includes(q));

  const sf = document.getElementById('statusFilter').value;
  if (sf) list = list.filter(a => calcStatus(a) === sf);

  if (sortKey) {
    list.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
  }
  return list;
}

function setView(view, el) {
  currentView = view; currentPhaseView = null; currentPage = 1;
  document.querySelectorAll('.d-nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  const titles = { all: '전체 Agent 현황', delay: '지연 Agent', missing: '산출물 미비 Agent', complete: '완료 Agent', progress: '진행중 Agent' };
  document.getElementById('pageTitle').textContent = titles[view];
  renderDashboard();
}

function setPhaseView(phase, el) {
  currentPhaseView = phase; currentView = 'all'; currentPage = 1;
  document.querySelectorAll('.d-nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('pageTitle').textContent = `${phase} 단계 Agent`;
  renderDashboard();
}

function goPage(p) { currentPage = p; renderDashboard(); }

// ── 메인 렌더 ──────────────────────────────
function renderDashboard(flashId = null) {
  const list = getFiltered();
  const total = list.length;
  const done = list.filter(a => calcStatus(a) === 'complete').length;
  const delay = list.filter(a => calcStatus(a) === 'delay').length;
  const missing = list.filter(a => calcStatus(a) === 'missing').length;
  const rate = total ? Math.round(done / total * 100) : 0;

  // KPI
  document.getElementById('kpi-total').textContent = total;
  document.getElementById('kpi-rate').textContent = rate + '%';
  document.getElementById('kpi-done-sub').textContent = `${done}개 완료`;
  document.getElementById('kpi-delay').textContent = delay;
  document.getElementById('kpi-missing').textContent = missing;

  // 단계별 분포
  document.getElementById('phaseBars').innerHTML = PHASES.map((ph, i) => {
    const count = list.filter(a => a.phases[i] === 'current').length;
    const pct = list.length ? Math.round(count / list.length * 100) : 0;
    return `<div class="d-phase-bar-item">
      <div class="d-phase-count" style="color:${PHASE_COLORS[i]}">${count}</div>
      <div class="d-phase-bar-track"><div class="d-phase-bar-fill" style="width:${pct}%;background:${PHASE_COLORS[i]};"></div></div>
      <div class="d-phase-label">${ph}</div>
    </div>`;
  }).join('');

  // 위험 패널
  const risks = agents.filter(a => calcStatus(a) === 'delay' || calcStatus(a) === 'missing').slice(0, 6);
  document.getElementById('riskCount').textContent = `${risks.length}건`;
  document.getElementById('riskList').innerHTML = risks.length
    ? risks.map(a => {
        const st = calcStatus(a);
        const ci = a.phases.findIndex(p => p === 'current');
        return `<div class="d-risk-item">
          <span class="d-risk-badge ${st === 'delay' ? 'd-risk-delay' : 'd-risk-missing'}">${st === 'delay' ? '지연' : '미비'}</span>
          <div><div class="d-risk-name">${a.name}</div><div class="d-risk-phase">${a.owner} · ${ci >= 0 ? PHASES[ci] : '완료'} 단계</div></div>
        </div>`;
      }).join('')
    : '<div style="color:#7a7570;font-size:12px;padding:14px 0;text-align:center;">위험 Agent 없음 ✓</div>';

  // 테이블
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = list.slice(start, start + PAGE_SIZE);
  document.getElementById('tableBody').innerHTML = page.map(a => {
    const prog = calcProgress(a.phases);
    const st = calcStatus(a);
    const phasePills = a.phases.map((s, i) => `<span class="d-phase-pill ${s}" title="${PHASES[i]}">${PHASES[i][0]}</span>`).join('');
    const progColor = prog >= 80 ? '#2d6a4f' : prog >= 40 ? '#b5830a' : '#c0392b';
    const artChips = ARTIFACTS.map(art => `<span class="d-art-chip ${a.artifacts[art] === 'y' ? 'd-art-y' : 'd-art-n'}">${ART_LABELS[art]}</span>`).join('');
    const isOverdue = a.due && a.due !== '—' && new Date(a.due) < new Date() && st !== 'complete';
    return `<tr class="${flashId === a.id ? 'd-flash' : ''}">
      <td><span style="font-size:11px;font-family:monospace;color:#7a7570;">${a.id}</span></td>
      <td><div style="font-weight:500;">${a.name}</div><div style="margin-top:2px;">${artChips}</div></td>
      <td style="color:#7a7570;font-size:12px;">${a.owner}</td>
      <td>${phasePills}</td>
      <td>
        <div class="d-prog-track"><div class="d-prog-fill" style="width:${prog}%;background:${progColor};"></div></div>
        <span style="font-size:11px;font-weight:600;">${prog}%</span>
      </td>
      <td></td>
      <td><span class="d-status-badge ${D_ST_CLASS[st]}">${D_ST_LABEL[st]}</span></td>
      <td style="font-size:11px;color:${isOverdue ? '#c0392b' : '#7a7570'};">${a.due || '—'}</td>
      <td><button class="d-btn d-btn-ghost" style="padding:3px 9px;font-size:11px;" onclick="editAgent('${a.id}')">수정</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="9" style="text-align:center;padding:28px;color:#7a7570;">해당하는 Agent가 없습니다.</td></tr>';

  // 페이지네이션
  const totalPages = Math.ceil(list.length / PAGE_SIZE);
  document.getElementById('paginationInfo').textContent = `${list.length}개 중 ${start + 1}–${Math.min(start + PAGE_SIZE, list.length)}개`;
  document.getElementById('pageBtns').innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce((acc, p, idx, arr) => { if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('…'); acc.push(p); return acc; }, [])
    .map(p => p === '…'
      ? `<span style="padding:0 3px;color:#7a7570;">…</span>`
      : `<button class="d-page-btn ${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`)
    .join('');

  // 사이드바 통계
  const t = agents.length, d = agents.filter(a => calcStatus(a) === 'complete').length;
  document.getElementById('sb-total').textContent = t;
  document.getElementById('sb-rate').textContent = Math.round(d / t * 100) + '%';
  document.getElementById('sb-risk').textContent = agents.filter(a => calcStatus(a) === 'delay').length;
  document.getElementById('sb-missing').textContent = agents.filter(a => calcStatus(a) === 'missing').length;

  // 탭 배지
  document.getElementById('nav-agent-count').textContent = `${t} agents`;

  // Webhook 셀렉트 업데이트
  ['commit-agent', 'ci-agent'].forEach(id => {
    const sel = document.getElementById(id);
    const cur = sel.value;
    sel.innerHTML = '<option value="">Agent 선택...</option>' +
      agents.map(a => `<option value="${a.id}" ${a.id === cur ? 'selected' : ''}>${a.id} · ${a.name}</option>`).join('');
  });
}

// ── 모달 ───────────────────────────────────
let editingId = null;
let phaseStates = ['pending', 'pending', 'pending', 'pending', 'pending'];
let artStates = { tc: 'n', req: 'n', design: 'n', report: 'n' };

function openModal() {
  editingId = null;
  phaseStates = ['pending', 'pending', 'pending', 'pending', 'pending'];
  artStates = { tc: 'n', req: 'n', design: 'n', report: 'n' };
  document.getElementById('f-id').value = `AGT-${String(agents.length + 1).padStart(3, '0')}`;
  document.getElementById('f-name').value = '';
  document.getElementById('f-owner').value = '';
  document.getElementById('f-due').value = '';
  document.getElementById('f-status').value = 'progress';
  renderPhaseToggles(); renderArtToggles(); dSwitchTab('manual');
  document.getElementById('addModal').classList.add('open');
}

function editAgent(id) {
  const a = agents.find(ag => ag.id === id); if (!a) return;
  editingId = id; phaseStates = [...a.phases]; artStates = { ...a.artifacts };
  document.getElementById('f-id').value = a.id;
  document.getElementById('f-name').value = a.name;
  document.getElementById('f-owner').value = a.owner;
  document.getElementById('f-due').value = a.due || '';
  document.getElementById('f-status').value = a.status;
  renderPhaseToggles(); renderArtToggles(); dSwitchTab('manual');
  document.getElementById('addModal').classList.add('open');
}

function closeModal() { document.getElementById('addModal').classList.remove('open'); }

function dSwitchTab(tab) {
  document.querySelectorAll('.d-modal-tab').forEach((t, i) => t.classList.toggle('active', (i === 0 && tab === 'manual') || (i === 1 && tab === 'csv')));
  document.querySelectorAll('.d-tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`d-tab-${tab}`).classList.add('active');
}

function cyclePhase(btn) {
  const i = parseInt(btn.dataset.phase);
  phaseStates[i] = phaseStates[i] === 'pending' ? 'done' : phaseStates[i] === 'done' ? 'current' : 'pending';
  renderPhaseToggles();
}

function renderPhaseToggles() {
  document.querySelectorAll('#phaseToggles .d-phase-toggle-btn').forEach((btn, i) => {
    btn.className = 'd-phase-toggle-btn';
    if (phaseStates[i] === 'done') btn.classList.add('active-done');
    else if (phaseStates[i] === 'current') btn.classList.add('active-current');
    btn.textContent = PHASES[i] + (phaseStates[i] === 'done' ? ' ✓' : phaseStates[i] === 'current' ? ' ▶' : '');
  });
}

function toggleArt(btn) {
  const a = btn.dataset.art;
  artStates[a] = artStates[a] === 'y' ? 'n' : 'y';
  renderArtToggles();
}

function renderArtToggles() {
  document.querySelectorAll('#artToggles .d-art-toggle').forEach(btn => {
    const a = btn.dataset.art;
    btn.className = `d-art-toggle${artStates[a] === 'y' ? ' on' : ''}`;
    btn.textContent = ART_LABELS[a] + (artStates[a] === 'y' ? ' ✓' : '');
  });
}

function saveAgent() {
  const id = document.getElementById('f-id').value.trim();
  const name = document.getElementById('f-name').value.trim();
  if (!id || !name) { alert('ID와 이름은 필수입니다.'); return; }
  const prog = Math.round(phaseStates.filter(p => p === 'done').length / 5 * 100);
  const agent = {
    id, name,
    owner: document.getElementById('f-owner').value.trim() || '미지정',
    due: document.getElementById('f-due').value || '—',
    phases: phaseStates,
    artifacts: { ...artStates },
    status: document.getElementById('f-status').value,
    progress: prog
  };
  if (editingId) { const idx = agents.findIndex(a => a.id === editingId); if (idx >= 0) agents[idx] = agent; }
  else agents.push(agent);
  closeModal(); renderDashboard();
}

// ── CSV ────────────────────────────────────
function handleCSV(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split('\n').filter(l => l.trim());
    lines.slice(1).forEach(row => {
      const cols = row.split(',').map(c => c.trim()); if (cols.length < 9) return;
      const [id, name, owner, due, p1, p2, p3, p4, p5, tc, req, design, report, status] = cols;
      const phases = [p1, p2, p3, p4, p5].map(p => p || 'pending');
      const prog = Math.round(phases.filter(p => p === 'done').length / 5 * 100);
      const existing = agents.findIndex(a => a.id === id);
      const agent = { id, name, owner, due, phases, artifacts: { tc: tc || 'n', req: req || 'n', design: design || 'n', report: report || 'n' }, status: status || 'progress', progress: prog };
      if (existing >= 0) agents[existing] = agent; else agents.push(agent);
    });
    closeModal(); renderDashboard(); alert('업데이트 완료');
  };
  reader.readAsText(file);
}

function exportCSV() {
  const header = 'id,name,owner,due,p1,p2,p3,p4,p5,tc,req,design,report,status,progress';
  const rows = agents.map(a => [a.id, a.name, a.owner, a.due, ...a.phases, ...ARTIFACTS.map(k => a.artifacts[k]), a.status, calcProgress(a.phases)].join(','));
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'ax-agents.csv'; link.click();
}
