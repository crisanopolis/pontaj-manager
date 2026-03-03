// ============================================================
//  PONTAJ MANAGER — app.js  v3.0
//  Backend API (Node.js server) in loc de localStorage
// ============================================================

const API = 'http://localhost:3000/api';

const MONTHS_RO = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
const DAYS_RO = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'];
const AVATAR_COLORS = [
    { bg: 'rgba(59,111,255,.22)', c: '#3b6fff' }, { bg: 'rgba(0,194,255,.22)', c: '#00c2ff' },
    { bg: 'rgba(155,89,182,.22)', c: '#9b59b6' }, { bg: 'rgba(39,174,96,.22)', c: '#27ae60' },
    { bg: 'rgba(245,166,35,.22)', c: '#f5a623' }, { bg: 'rgba(231,76,60,.22)', c: '#e74c3c' },
    { bg: 'rgba(26,188,156,.22)', c: '#1abc9c' }, { bg: 'rgba(231,76,60,.22)', c: '#e67e22' },
];

// ============================================================
//  API HELPERS
// ============================================================
async function apiGet(path) {
    const r = await fetch(API + path);
    if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
    return r.json();
}
async function apiPost(path, data) {
    const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(`POST ${path} → ${r.status}`);
    return r.json();
}
async function apiDelete(path) {
    const r = await fetch(API + path, { method: 'DELETE' });
    if (!r.ok) throw new Error(`DELETE ${path} → ${r.status}`);
    return r.json();
}

// ============================================================
//  STATE (cache local pentru performanta)
// ============================================================
let _projects = [];
let _persons = [];
let currentProjectId = null;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let pontajData = {};
let atpSelectedPersonId = null;

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function getMemberConfig(proj, personId) {
    return (proj?.members || []).find(m => m.personId === personId) || null;
}

// ============================================================
//  INCARCARE DATE INITIALE
// ============================================================
async function loadAll() {
    try {
        [_projects, _persons] = await Promise.all([
            apiGet('/projects'),
            apiGet('/persons'),
        ]);
    } catch (e) {
        toast('❌', 'Nu pot conecta la server! Porneste start.bat');
        console.error(e);
    }
}

// ============================================================
//  NAVIGATION
// ============================================================
function goTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    const link = document.querySelector(`[data-page="${page}"]`);
    if (link) link.classList.add('active');
    if (page === 'projects') loadAll().then(() => renderProjects()); // reload fresh from server
    if (page === 'persons') renderPersonsDB();
    if (page === 'history') renderHistory();
    if (page === 'individual') renderIndividualSelects();
}
function goToRaw(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// ============================================================
//  PROJECTS
// ============================================================
function renderProjects() {
    const grid = document.getElementById('projects-grid');
    const empty = document.getElementById('projects-empty');
    grid.innerHTML = '';
    if (!_projects.length) { empty.style.display = ''; return; }
    empty.style.display = 'none';
    _projects.forEach(proj => {
        const memberCount = (proj.members || []).length;
        const color = proj.color || '#3b6fff';
        const div = document.createElement('div');
        div.className = 'project-card';
        div.innerHTML = `
      <div class="pc-bar" style="background:${color}"></div>
      <div class="pc-body" onclick="openProject('${proj.id}')">
        <div class="pc-smis">SMIS ${proj.smis}</div>
        <div class="pc-name">${proj.name}</div>
        <div class="pc-contract">Contract: ${proj.contract || '–'}</div>
        <div class="pc-meta">
          <span class="pc-badge" 
            style="cursor:pointer;border:1px solid var(--accent);transition:background .2s" 
            title="Click pentru a gestiona membrii"
            onmouseenter="this.style.background='rgba(59,111,255,0.2)'" 
            onmouseleave="this.style.background=''" 
            onclick="event.stopPropagation();openManageMembers('${proj.id}')">
            👥 ${memberCount} membri
          </span>
          <span class="pc-badge">${proj.instName || proj.partner || ''}</span>
        </div>
      </div>
      <div class="pc-actions">
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();editProjectById('${proj.id}')">✏️ Editează</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteProject('${proj.id}')">🗑️ Șterge</button>
      </div>`;
        grid.appendChild(div);
    });
}

function openProjectModal(id) {
    document.getElementById('mp-title').textContent = id ? 'Editează proiect' : 'Proiect nou';
    const proj = id ? _projects.find(p => p.id === id) : null;
    document.getElementById('mp-id').value = proj?.id || '';
    document.getElementById('mp-name').value = proj?.name || '';
    document.getElementById('mp-smis').value = proj?.smis || '';
    document.getElementById('mp-contract').value = proj?.contract || '';
    document.getElementById('mp-partner').value = proj?.partner || 'LP-BST';
    document.getElementById('mp-inst').value = proj?.instName || '';
    document.getElementById('mp-addr').value = proj?.instAddr || '';
    document.getElementById('mp-etapa').value = proj?.etapa || '';
    document.getElementById('mp-intocmit').value = proj?.intocmit || '';
    document.getElementById('mp-verificat').value = proj?.verificat || '';
    document.getElementById('mp-color').value = proj?.color || '#3b6fff';
    showModal('modal-project');
}
function editProjectById(id) { openProjectModal(id); }
function editProject() { openProjectModal(currentProjectId); }

async function saveProject() {
    const name = document.getElementById('mp-name').value.trim();
    const smis = document.getElementById('mp-smis').value.trim();
    if (!name || !smis) { toast('⚠️', 'Completează Denumirea și Codul SMIS!'); return; }
    const id = document.getElementById('mp-id').value || uid();
    const existing = _projects.find(p => p.id === id);
    const proj = {
        id, name, smis,
        contract: document.getElementById('mp-contract').value,
        partner: document.getElementById('mp-partner').value,
        instName: document.getElementById('mp-inst').value,
        instAddr: document.getElementById('mp-addr').value,
        etapa: document.getElementById('mp-etapa').value,
        intocmit: document.getElementById('mp-intocmit').value,
        verificat: document.getElementById('mp-verificat').value,
        color: document.getElementById('mp-color').value,
        members: existing ? (existing.members || []) : [],
    };
    try {
        const saved = await apiPost('/projects', proj);
        const idx = _projects.findIndex(p => p.id === saved.id);
        if (idx >= 0) _projects[idx] = saved; else _projects.push(saved);
        closeModal('modal-project');
        renderProjects();
        toast('✅', `Proiectul "${name}" salvat!`);
    } catch (e) { toast('❌', 'Eroare la salvare: ' + e.message); }
}

async function deleteProject(id) {
    const proj = _projects.find(p => p.id === id);
    if (!proj) return;
    if (!await confirmAction(`Ștergi proiectul "${proj.name}"? Pontajele salvate vor fi șterse.`)) return;
    try {
        await apiDelete(`/projects/${id}`);
        _projects = _projects.filter(p => p.id !== id);
        renderProjects();
        toast('🗑️', 'Proiect șters.');
    } catch (e) { toast('❌', 'Eroare la ștergere: ' + e.message); }
}

// ============================================================
//  MANAGE MEMBERS MODAL (from dashboard)
// ============================================================
function openManageMembers(projId) {
    const proj = _projects.find(p => p.id === projId);
    if (!proj) return;

    document.getElementById('mm-proj-name').textContent = proj.name;

    const list = document.getElementById('mm-list');
    const members = proj.members || [];

    if (!members.length) {
        list.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:24px">
            Niciun membru înregistrat în acest proiect.</p>`;
    } else {
        list.innerHTML = members.map(m => {
            const person = _persons.find(p => p.id === m.personId);
            if (!person) return '';
            const tagCls = m.type === 'Management' ? 'tag-mgt' : 'tag-cer';
            return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;
                background:var(--surface2);border:1px solid var(--border);border-radius:10px">
                <div style="flex:1">
                    <div style="font-weight:600;font-size:14px">${person.name} ${person.fname}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
                        ${m.partner || '–'} · <span class="tag ${tagCls}">${m.type || '–'}</span>
                    </div>
                </div>
                <button class="btn btn-danger btn-sm" 
                    onclick="removeMemberFromProject('${projId}','${m.personId}')"
                    title="Scoate complet din proiect">🗑️</button>
            </div>`;
        }).join('');
    }

    showModal('modal-manage-members');
}

async function removeMemberFromProject(projId, personId) {
    const proj = _projects.find(p => p.id === projId);
    const person = _persons.find(p => p.id === personId);
    if (!proj || !person) return;
    if (!confirm(`Scoți definitiv pe ${person.name} ${person.fname} din proiectul ${proj.name}?\nAceasta va șterge și toate pontajele salvate pentru această persoană.`)) return;

    // 1. Scoate din proj.members
    proj.members = (proj.members || []).filter(m => m.personId !== personId);
    try {
        const saved = await apiPost('/projects', proj);
        const idx = _projects.findIndex(p => p.id === saved.id);
        if (idx >= 0) _projects[idx] = saved;
    } catch (e) { toast('❌', 'Eroare actualizare proiect: ' + e.message); return; }

    // 2. Sterge datele de pontaj din TOATE lunile proiectului
    try {
        const allPontaj = await apiGet(`/pontaj/${projId}/all`);
        // allPontaj = { "projId_year_month": { personId: {...}, ... }, ... }
        const updatePromises = Object.entries(allPontaj).map(async ([key, monthData]) => {
            if (monthData[personId] !== undefined) {
                delete monthData[personId];
                // key = "projId_year_month"
                const parts = key.replace(`${projId}_`, '').split('_');
                const year = parts[0], month = parts[1];
                await apiPost(`/pontaj/${projId}/${year}/${month}`, monthData);
            }
        });
        await Promise.all(updatePromises);
    } catch (e) {
        console.warn('Nu s-au putut sterge pontajele:', e);
    }

    // 3. Daca suntem in proiectul asta, elimina din vizualizarea curenta
    if (currentProjectId === projId && pontajData[personId] !== undefined) {
        delete pontajData[personId];
        renderProjectPersons();
        updateProjectStats();
    }

    // 4. Reimprospateaza modalul si dashboard-ul
    openManageMembers(projId);
    renderProjects();
    toast('✅', `${person.name} ${person.fname} scos complet din ${proj.name}.`);
}



// ============================================================
function openProject(id) {
    currentProjectId = id;
    const proj = _projects.find(p => p.id === id);
    if (!proj) return;
    document.getElementById('pd-title').textContent = proj.name;
    document.getElementById('pd-sub').textContent = `SMIS ${proj.smis} · ${proj.contract || ''} · ${proj.instName || proj.partner}`;
    currentMonth = new Date().getMonth() + 1;
    currentYear = new Date().getFullYear();
    document.getElementById('pd-month').value = currentMonth;
    document.getElementById('pd-year').value = currentYear;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    loadPontajMonth();
    goToRaw('page-project-detail');
}

async function loadPontajMonth() {
    currentMonth = +document.getElementById('pd-month').value;
    currentYear = +document.getElementById('pd-year').value;
    try {
        pontajData = await apiGet(`/pontaj/${currentProjectId}/${currentYear}/${currentMonth}`);
    } catch {
        pontajData = {};
    }
    renderProjectPersons();
    updateProjectStats();
}

function buildDefaultDays(memberConfig) {
    const total = getDaysInMonth(currentYear, currentMonth);
    const ore = memberConfig?.defaultOre ?? 8;
    const norma = memberConfig?.defaultNorma ?? 0;
    const days = {}, normaDays = {};
    for (let d = 1; d <= total; d++) {
        if (!isWeekend(currentYear, currentMonth, d)) { days[d] = ore; normaDays[d] = norma; }
        else { days[d] = 0; normaDays[d] = 0; }
    }
    return { days, norma: normaDays };
}

async function savePontajState() {
    try {
        await apiPost(`/pontaj/${currentProjectId}/${currentYear}/${currentMonth}`, pontajData);
    } catch (e) { console.error('Save error:', e); }
}

// ============================================================
//  RENDER PROJECT PERSONS
// ============================================================
function renderProjectPersons() {
    const container = document.getElementById('pd-persons-list');
    const empty = document.getElementById('pd-empty');
    container.innerHTML = '';
    const proj = _projects.find(p => p.id === currentProjectId);

    // Afisam DOAR persoanele care sunt in proj.members (sursa de adevar)
    // si au date de pontaj in luna curenta
    const memberIds = new Set((proj?.members || []).map(m => m.personId));
    const pids = Object.keys(pontajData).filter(pid => memberIds.has(pid));

    if (!pids.length) { empty.style.display = ''; return; }
    empty.style.display = 'none';
    pids.forEach((pid, idx) => {
        const person = _persons.find(p => p.id === pid);
        if (!person) return;
        const memberCfg = getMemberConfig(proj, pid);
        container.appendChild(buildPontajCard(person, idx, memberCfg));
    });
}

function buildPontajCard(person, idx, memberCfg) {
    const col = AVATAR_COLORS[idx % AVATAR_COLORS.length];
    const pd = pontajData[person.id] || buildDefaultDays(memberCfg);
    const total = getDaysInMonth(currentYear, currentMonth);
    const firstDow = new Date(currentYear, currentMonth - 1, 1).getDay();
    const ore = sumOre(pd.days);
    const partner = memberCfg?.partner || person.partner || '–';
    const type = memberCfg?.type || person.type || 'Cercetare';
    const tagCls = type === 'Management' ? 'tag-mgt' : 'tag-cer';
    const headers = DAYS_RO.map(d => `<div class="cal-dh">${d}</div>`).join('');
    let cells = '';
    for (let i = 0; i < firstDow; i++) cells += `<div class="cal-cell"></div>`;
    for (let d = 1; d <= total; d++) {
        const we = isWeekend(currentYear, currentMonth, d);
        const v = pd.days?.[d] ?? 0;
        const nv = pd.norma?.[d] ?? 0;
        const cls = we ? 'we' : (v > 0 || String(v).toUpperCase() === 'CO' ? 'active' : '');
        const coStr = String(v).toUpperCase() === 'CO' ? 'CO' : '';
        cells += `<div class="cal-cell">
      <div class="day-num">${d}</div>
      <input class="day-inp ${cls}" data-d="${d}" value="${coStr || v}"
        onchange="onDayChange('${person.id}',${d},this)" onfocus="this.select()" inputmode="decimal" />
      <input class="day-nb" data-nb="${d}" value="${nv}"
        onchange="onNormaChange('${person.id}',${d},this)" onfocus="this.select()" inputmode="decimal" />
    </div>`;
    }
    const div = document.createElement('div');
    div.className = 'person-pontaj-card';
    div.id = `ppc-${person.id}`;
    div.innerHTML = `
    <div class="ppc-header" onclick="toggleCard('${person.id}')">
      <div class="ppc-avatar" style="background:${col.bg};color:${col.c}">${person.name[0]}${person.fname[0]}</div>
      <div class="ppc-info">
        <div class="ppc-name">${person.name} ${person.fname}</div>
        <div class="ppc-meta">CNP: ${person.cnp || '–'} · ${partner} · <span class="tag ${tagCls}">${type}</span></div>
      </div>
      <div class="ppc-total"><span class="big" id="ore-${person.id}" style="color:${col.c}">${ore}</span><div class="lbl">ore proiect</div></div>
      <span class="ppc-chevron">▼</span>
    </div>
    <div class="ppc-body">
      <div class="preset-row">
        <button class="preset-btn" onclick="applyPreset('${person.id}',8)">8h zile lucr.</button>
        <button class="preset-btn" onclick="applyPreset('${person.id}',4)">4h zile lucr.</button>
        <button class="preset-btn" onclick="applyPreset('${person.id}',2)">2h zile lucr.</button>
        <button class="preset-btn" onclick="applyPreset('${person.id}',1)">1h zile lucr.</button>
        <button class="preset-btn" onclick="clearOre('${person.id}')">Șterge ore</button>
        <button class="preset-btn" onclick="applyNorma('${person.id}',8)">Norma: 8h</button>
        <button class="preset-btn" onclick="applyNorma('${person.id}',0)">Norma: 0h</button>
        <button class="preset-btn" onclick="resetToDefault('${person.id}')">↺ Reset implicit</button>
        <button class="preset-btn" onclick="editMemberConfig('${person.id}')" style="border-color:var(--accent);color:var(--accent2)">⚙️ Config</button>
      </div>
      <div class="cal-grid">${headers}${cells}</div>
      <div class="hours-row">
        <div class="hours-chip"><div class="dot" style="background:#3b6fff"></div>Proiect: <strong id="s-ore-${person.id}">${ore}</strong></div>
        <div class="hours-chip"><div class="dot" style="background:#6a7a96"></div>Norma: <strong id="s-norma-${person.id}">${sumOre(pd.norma)}</strong></div>
        <div class="hours-chip"><div class="dot" style="background:#27ae60"></div>Total: <strong id="s-total-${person.id}">${ore + sumOre(pd.norma)}</strong></div>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:12px">
        <button class="btn btn-danger btn-sm" onclick="removePersonFromMonth('${person.id}')">🗑️ Scoate din lună</button>
      </div>
    </div>`;
    return div;
}

function toggleCard(personId) {
    document.getElementById(`ppc-${personId}`)?.classList.toggle('expanded');
}

// ============================================================
//  MEMBER CONFIG
// ============================================================
function editMemberConfig(personId) {
    const proj = _projects.find(p => p.id === currentProjectId);
    const cfg = getMemberConfig(proj, personId) || {};
    const person = _persons.find(p => p.id === personId);
    document.getElementById('mc-person-name').textContent = `${person?.name} ${person?.fname}`;
    document.getElementById('mc-person-id').value = personId;
    document.getElementById('mc-partner').value = cfg.partner || person?.partner || '';
    document.getElementById('mc-type').value = cfg.type || person?.type || 'Cercetare';
    document.getElementById('mc-ore').value = cfg.defaultOre ?? person?.defaultOre ?? 8;
    document.getElementById('mc-norma').value = cfg.defaultNorma ?? person?.defaultNorma ?? 0;
    showModal('modal-member-config');
}

async function saveMemberConfig() {
    const personId = document.getElementById('mc-person-id').value;
    const partner = document.getElementById('mc-partner').value.trim();
    const type = document.getElementById('mc-type').value;
    const defaultOre = parseFloat(document.getElementById('mc-ore').value) || 0;
    const defaultNorma = parseFloat(document.getElementById('mc-norma').value) || 0;
    const proj = _projects.find(p => p.id === currentProjectId);
    if (!proj) return;
    if (!proj.members) proj.members = [];
    const idx = proj.members.findIndex(m => m.personId === personId);
    const cfg = { personId, partner, type, defaultOre, defaultNorma };
    if (idx >= 0) proj.members[idx] = cfg; else proj.members.push(cfg);
    try {
        await apiPost('/projects', proj);
        closeModal('modal-member-config');
        renderProjectPersons();
        toast('✅', `Configurație salvată: ${partner} — ${type}`);
    } catch (e) { toast('❌', 'Eroare: ' + e.message); }
}

// ============================================================
//  DAY CHANGES
// ============================================================
function onDayChange(pid, d, el) {
    if (!pontajData[pid]) return;
    const val = el.value.trim().toUpperCase();
    if (val === 'CO') {
        pontajData[pid].days[d] = 'CO';
        el.classList.remove('active', 'we'); el.classList.add('co');
    } else {
        const n = parseFloat(val) || 0;
        pontajData[pid].days[d] = n;
        const we = isWeekend(currentYear, currentMonth, d);
        el.classList.remove('co');
        el.classList.toggle('we', we);
        el.classList.toggle('active', !we && n > 0);
        el.value = n;
    }
    savePontajState();
    updateCardTotals(pid);
}

function onNormaChange(pid, d, el) {
    if (!pontajData[pid]) return;
    pontajData[pid].norma[d] = parseFloat(el.value) || 0;
    savePontajState();
    updateCardTotals(pid);
}

function updateCardTotals(pid) {
    const pd = pontajData[pid];
    if (!pd) return;
    const ore = sumOre(pd.days), norma = sumOre(pd.norma);
    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl(`ore-${pid}`, ore); setEl(`s-ore-${pid}`, ore);
    setEl(`s-norma-${pid}`, norma); setEl(`s-total-${pid}`, ore + norma);
    updateProjectStats();
}

// ============================================================
//  PRESETS
// ============================================================
function applyPreset(pid, h) {
    if (!pontajData[pid]) return;
    const total = getDaysInMonth(currentYear, currentMonth);
    for (let d = 1; d <= total; d++) if (!isWeekend(currentYear, currentMonth, d)) pontajData[pid].days[d] = h;
    savePontajState(); renderProjectPersons(); updateProjectStats();
}
function clearOre(pid) {
    if (!pontajData[pid]) return;
    const total = getDaysInMonth(currentYear, currentMonth);
    for (let d = 1; d <= total; d++) pontajData[pid].days[d] = 0;
    savePontajState(); renderProjectPersons(); updateProjectStats();
}
function applyNorma(pid, h) {
    if (!pontajData[pid]) return;
    const total = getDaysInMonth(currentYear, currentMonth);
    for (let d = 1; d <= total; d++) if (!isWeekend(currentYear, currentMonth, d)) pontajData[pid].norma[d] = h;
    savePontajState(); renderProjectPersons(); updateProjectStats();
}
function resetToDefault(pid) {
    const proj = _projects.find(p => p.id === currentProjectId);
    const cfg = getMemberConfig(proj, pid);
    if (!cfg) return;
    pontajData[pid] = buildDefaultDays(cfg);
    savePontajState(); renderProjectPersons(); updateProjectStats();
}

// ============================================================
//  ADD / REMOVE PERSON FROM MONTH
// ============================================================
function openAddPersonToProject() {
    atpSelectedPersonId = null;
    document.getElementById('atp-search').value = '';
    document.getElementById('atp-config-panel').style.display = 'none';
    renderAtpList();
    showModal('modal-add-to-project');
}

function renderAtpList() {
    const q = document.getElementById('atp-search').value.toLowerCase();
    const existing = new Set(Object.keys(pontajData));
    const persons = _persons.filter(p => !q || `${p.name} ${p.fname} ${p.cnp}`.toLowerCase().includes(q));
    const list = document.getElementById('atp-list');
    list.innerHTML = '';
    if (!persons.length) { list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px">Nicio persoană găsită.</p>'; return; }
    persons.forEach((p, idx) => {
        const col = AVATAR_COLORS[idx % AVATAR_COLORS.length];
        const already = existing.has(p.id);
        const div = document.createElement('div');
        div.className = 'atp-item' + (already ? ' already' : '');
        div.innerHTML = `
      <div class="atp-avatar" style="background:${col.bg};color:${col.c}">${p.name[0]}${p.fname[0]}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${p.name} ${p.fname}</div>
        <div style="font-size:11px;color:var(--text-muted)">CNP: ${p.cnp || '–'} · <span class="tag ${p.type === 'Management' ? 'tag-mgt' : 'tag-cer'}">${p.type || '–'}</span></div>
      </div>
      ${already ? '<span style="font-size:11px;color:var(--text-muted)">✓ În lună</span>' : '<span style="font-size:12px;color:var(--accent2);font-weight:600">+ Selectează</span>'}`;
        if (!already) div.onclick = () => selectPersonForMonth(p.id);
        list.appendChild(div);
    });
}

function selectPersonForMonth(personId) {
    atpSelectedPersonId = personId;
    const person = _persons.find(p => p.id === personId);
    const proj = _projects.find(p => p.id === currentProjectId);
    const existingCfg = getMemberConfig(proj, personId);
    document.getElementById('atp-cfg-name').textContent = `${person.name} ${person.fname}`;
    document.getElementById('atp-cfg-partner').value = existingCfg?.partner || person.partner || proj?.partner || 'LP-BST';
    document.getElementById('atp-cfg-type').value = existingCfg?.type || person.type || 'Cercetare';
    document.getElementById('atp-cfg-ore').value = existingCfg?.defaultOre ?? person.defaultOre ?? 8;
    document.getElementById('atp-cfg-norma').value = existingCfg?.defaultNorma ?? person.defaultNorma ?? 0;
    document.getElementById('atp-config-panel').style.display = 'block';
    document.getElementById('atp-config-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function confirmAddPersonToMonth() {
    if (!atpSelectedPersonId) { toast('⚠️', 'Selectează o persoană mai întâi!'); return; }
    const personId = atpSelectedPersonId;
    const person = _persons.find(p => p.id === personId);
    if (!person) return;
    const partner = document.getElementById('atp-cfg-partner').value.trim();
    const type = document.getElementById('atp-cfg-type').value;
    const defaultOre = parseFloat(document.getElementById('atp-cfg-ore').value) || 0;
    const defaultNorma = parseFloat(document.getElementById('atp-cfg-norma').value) || 0;
    const proj = _projects.find(p => p.id === currentProjectId);
    if (!proj) return;
    if (!proj.members) proj.members = [];
    const mIdx = proj.members.findIndex(m => m.personId === personId);
    const cfg = { personId, partner, type, defaultOre, defaultNorma };
    if (mIdx >= 0) proj.members[mIdx] = cfg; else proj.members.push(cfg);
    try {
        await apiPost('/projects', proj);
        if (!pontajData[personId]) pontajData[personId] = buildDefaultDays(cfg);
        await savePontajState();
        atpSelectedPersonId = null;
        document.getElementById('atp-config-panel').style.display = 'none';
        document.getElementById('atp-search').value = '';
        renderAtpList(); renderProjectPersons(); updateProjectStats();
        toast('✅', `${person.name} ${person.fname} adăugat în ${MONTHS_RO[currentMonth - 1]} ${currentYear}`);
    } catch (e) { toast('❌', 'Eroare: ' + e.message); }
}

async function removePersonFromMonth(personId) {
    const person = _persons.find(p => p.id === personId);
    const monthName = MONTHS_RO[currentMonth - 1];
    if (!confirm(`Sco\u021bi pe ${person?.name} ${person?.fname} din ${monthName} ${currentYear}?\nDoar orele din aceast\u0103 lun\u0103 vor fi \u0219terse.\nPersoana r\u0103m\u00e2ne \u00een proiect (pentru \u0219tergere definitiv\u0103 \u2192 Proiecte \u2192 click pe \"X membri\").`)) return;

    // Stergem DOAR datele de pontaj din luna curenta
    // proj.members NU se modifica — persoana ramane in proiect
    delete pontajData[personId];
    await savePontajState();

    renderProjectPersons();
    updateProjectStats();
    toast('\ud83d\uddd1\ufe0f', `Orele lui ${person?.name} din ${monthName} ${currentYear} au fost \u0219terse.`);
}


// ============================================================
//  STATS
// ============================================================
function updateProjectStats() {
    const proj = _projects.find(p => p.id === currentProjectId);
    const memberIds = new Set((proj?.members || []).map(m => m.personId));
    const pids = Object.keys(pontajData).filter(pid => memberIds.has(pid));
    document.getElementById('ms-persons').textContent = pids.length;
    const totalOre = pids.reduce((acc, pid) => acc + sumOre(pontajData[pid]?.days || {}), 0);
    document.getElementById('ms-ore').textContent = totalOre;
    document.getElementById('ms-zile').textContent = getWorkdays(currentYear, currentMonth);
}

async function saveMonthExplicit() {
    await savePontajState();
    toast('💾', `Pontajul pentru ${MONTHS_RO[currentMonth - 1]} ${currentYear} a fost salvat!`);
}

// ============================================================
//  MONTH NAVIGATION
// ============================================================
function prevMonth() {
    if (currentMonth === 1) { currentMonth = 12; currentYear--; } else currentMonth--;
    document.getElementById('pd-month').value = currentMonth;
    document.getElementById('pd-year').value = currentYear;
    loadPontajMonth();
}
function nextMonth() {
    if (currentMonth === 12) { currentMonth = 1; currentYear++; } else currentMonth++;
    document.getElementById('pd-month').value = currentMonth;
    document.getElementById('pd-year').value = currentYear;
    loadPontajMonth();
}

// ============================================================
//  PERSONS DATABASE
// ============================================================
function renderPersonsDB() {
    const q = document.getElementById('persons-search')?.value.toLowerCase() || '';
    const persons = _persons.filter(p => !q || `${p.name} ${p.fname} ${p.cnp} ${p.cim || ''} ${p.cor || ''}`.toLowerCase().includes(q));
    const tbody = document.getElementById('persons-tbody');
    const empty = document.getElementById('persons-empty');
    tbody.innerHTML = '';
    if (!persons.length) { empty.style.display = ''; return; }
    empty.style.display = 'none';
    persons.forEach((p, idx) => {
        const tr = document.createElement('tr');
        const tagCls = p.type === 'Management' ? 'tag-mgt' : 'tag-cer';
        const projCount = _projects.filter(pr => (pr.members || []).some(m => m.personId === p.id)).length;
        const projBadge = projCount > 0
            ? `<span style="font-size:11px;background:var(--accent);color:#fff;border-radius:10px;padding:1px 7px;margin-left:6px">${projCount} proiect${projCount !== 1 ? 'e' : ''}</span>`
            : '';

        // CIM / COR mini info
        const cimInfo = p.cim ? `<span style="font-size:10px;color:var(--text-muted);margin-left:6px">CIM: ${p.cim}</span>` : '';
        const corInfo = p.cor ? `<span style="font-size:10px;color:var(--text-muted);margin-left:4px">COR: ${p.cor}</span>` : '';

        // Employer norma badges
        const employers = p.employers || [];
        const bst = employers.find(e => e.id === 'BST');
        const emi = employers.find(e => e.id === 'EMI');
        const hasOldData = !employers.length && (p.partner || p.defaultNorma !== undefined);
        const bstNormaFinal = bst ? bst.norma : (hasOldData ? (p.defaultNorma ?? 0) : null);
        const bstNormaUnit = bst?.normaUnit || 'zi';

        let employerCells = '';
        if (bst || hasOldData) {
            const normaLabel = `${bstNormaFinal}h/${bstNormaUnit}`;
            employerCells += `<span style="font-size:11px;background:rgba(59,111,255,.15);color:var(--accent);padding:2px 8px;border-radius:10px;margin-right:4px" title="Normă BST: ${normaLabel}">🏢 BST — nrm ${normaLabel}</span>`;
        }
        if (emi) {
            const emiNormaLabel = `${emi.norma}h/${emi.normaUnit || 'zi'}`;
            employerCells += `<span style="font-size:11px;background:rgba(155,89,182,.15);color:#9b59b6;padding:2px 8px;border-radius:10px" title="Normă EMI: ${emiNormaLabel}">🏭 EMI — nrm ${emiNormaLabel}</span>`;
        }
        if (!employerCells) employerCells = '<span style="color:var(--text-muted);font-size:12px">–</span>';

        tr.innerHTML = `
      <td>${idx + 1}</td>
      <td><strong>${p.name} ${p.fname}</strong>${projBadge}${cimInfo}${corInfo}</td>
      <td style="font-family:monospace;font-size:12px">${p.cnp || '–'}</td>
      <td style="font-size:12px">${employerCells}</td>
      <td><span class="tag ${tagCls}">${p.type || '–'}</span></td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="openPersonProjects('${p.id}')" title="Configurații per-proiect">📋</button>
        <button class="btn btn-ghost btn-sm" onclick="openPersonModal('${p.id}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deletePersonById('${p.id}')">🗑️</button>
      </td>`;
        tbody.appendChild(tr);
    });
}

// ============================================================
//  CONFIGURATII PER-PROIECT (din Baza de date persoane)
// ============================================================
function openPersonProjects(personId) {
    const person = _persons.find(p => p.id === personId);
    if (!person) return;

    document.getElementById('pp-person-name').textContent = `${person.name} ${person.fname}`;

    // Gasim toate proiectele in care e prezenta persoana
    const projs = _projects.filter(pr => (pr.members || []).some(m => m.personId === personId));
    const list = document.getElementById('pp-list');
    list.innerHTML = '';

    if (!projs.length) {
        list.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px">
            Această persoană nu este adăugată în niciun proiect momentan.</p>`;
        showModal('modal-person-projects');
        return;
    }

    projs.forEach(proj => {
        const cfg = (proj.members || []).find(m => m.personId === personId) || {};
        const tagCls = (cfg.type || person.type) === 'Management' ? 'tag-mgt' : 'tag-cer';
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:14px 16px';
        card.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
                <div>
                    <strong style="font-size:14px">${proj.name}</strong>
                    <span style="font-size:11px;color:var(--text-muted);margin-left:8px">SMIS ${proj.smis}</span>
                </div>
                <span class="tag ${tagCls}">${cfg.type || person.type || '–'}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
                <div>
                    <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Partener</label>
                    <input id="pp-partner-${proj.id}" value="${cfg.partner || person.partner || ''}"
                        style="width:100%;background:var(--input-bg);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text);font-size:13px" />
                </div>
                <div>
                    <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Tip</label>
                    <select id="pp-type-${proj.id}"
                        style="width:100%;background:var(--input-bg);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text);font-size:13px">
                        <option value="Cercetare" ${(cfg.type || person.type) === 'Cercetare' ? 'selected' : ''}>Cercetare</option>
                        <option value="Management" ${(cfg.type || person.type) === 'Management' ? 'selected' : ''}>Management</option>
                    </select>
                </div>
                <div style="display:flex;gap:8px">
                    <div style="flex:1">
                        <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Ore/zi</label>
                        <input type="number" id="pp-ore-${proj.id}" value="${cfg.defaultOre ?? person.defaultOre ?? 8}" min="0" max="24"
                            style="width:100%;background:var(--input-bg);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text);font-size:13px" />
                    </div>
                    <div style="flex:1">
                        <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">Normă/zi</label>
                        <input type="number" id="pp-norma-${proj.id}" value="${cfg.defaultNorma ?? person.defaultNorma ?? 0}" min="0" max="24"
                            style="width:100%;background:var(--input-bg);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text);font-size:13px" />
                    </div>
                </div>
            </div>
            <div style="text-align:right;margin-top:10px">
                <button class="btn btn-primary btn-sm" onclick="savePersonProjectConfig('${proj.id}','${personId}')">💾 Salvează</button>
            </div>`;
        list.appendChild(card);
    });

    showModal('modal-person-projects');
}

async function savePersonProjectConfig(projId, personId) {
    const proj = _projects.find(p => p.id === projId);
    if (!proj) return;
    if (!proj.members) proj.members = [];
    const idx = proj.members.findIndex(m => m.personId === personId);
    const updated = {
        personId: personId,
        partner: document.getElementById(`pp-partner-${projId}`)?.value.trim() || '',
        type: document.getElementById(`pp-type-${projId}`)?.value || 'Cercetare',
        defaultOre: parseFloat(document.getElementById(`pp-ore-${projId}`)?.value) || 8,
        defaultNorma: parseFloat(document.getElementById(`pp-norma-${projId}`)?.value) || 0,
    };
    if (idx >= 0) proj.members[idx] = { ...proj.members[idx], ...updated };
    else proj.members.push(updated);
    try {
        await apiPost('/projects', proj);
        const pi = _projects.findIndex(p => p.id === projId);
        if (pi >= 0) _projects[pi] = proj;
        toast('✅', `Config salvat pentru ${proj.name}!`);
    } catch (e) { toast('❌', 'Eroare salvare: ' + e.message); }
}



function toggleEmployerSection(which) {
    const checkbox = document.getElementById(`mpers-${which}-active`);
    const section = document.getElementById(`mpers-${which}-section`);
    if (!section) return;
    section.style.display = checkbox.checked ? 'block' : 'none';
}

// Actualizeaza limitele inputului cand se schimba unitatea (zi / luna)
function updateNormaUnit(which, field) {
    const unit = document.getElementById(`mpers-${which}-${field}-unit`).value;
    const input = document.getElementById(`mpers-${which}-${field}`);
    if (unit === 'luna') {
        input.max = 240;
        input.step = 1;
        // Daca valoarea e mai mica de 1, o scalăm automat × nr zile lucratoare
        if (parseFloat(input.value) <= 12) {
            const workdays = getWorkdays(new Date().getFullYear(), new Date().getMonth() + 1);
            input.value = Math.round(parseFloat(input.value) * workdays * 10) / 10;
        }
    } else {
        input.max = 12;
        input.step = 0.5;
        // Daca valoarea depaseste 12, resetam la 8
        if (parseFloat(input.value) > 12) input.value = 8;
    }
}

function openPersonModal(id) {
    const person = id ? _persons.find(p => p.id === id) : null;
    document.getElementById('mpers-title').textContent = id ? 'Editeaza persoana' : 'Persoana noua';
    document.getElementById('mpers-id').value = person?.id || '';
    document.getElementById('mpers-name').value = person?.name || '';
    document.getElementById('mpers-fname').value = person?.fname || '';
    document.getElementById('mpers-cnp').value = person?.cnp || '';
    document.getElementById('mpers-type').value = person?.type || 'Cercetare';
    // MySMIS fields
    document.getElementById('mpers-cim').value = person?.cim || '';
    document.getElementById('mpers-aa').value = person?.aa || '';
    document.getElementById('mpers-cor').value = person?.cor || '';

    // Populate employer sections
    const employers = person?.employers || [];
    const bst = employers.find(e => e.id === 'BST');
    const emi = employers.find(e => e.id === 'EMI');

    // Backward compat: old format with partner/defaultOre/defaultNorma treated as BST
    const oldBstData = !employers.length && person ? { norma: person.defaultNorma ?? 0 } : null;
    const bstData = bst || oldBstData;

    document.getElementById('mpers-bst-active').checked = !!bstData;
    document.getElementById('mpers-bst-section').style.display = bstData ? 'block' : 'none';
    document.getElementById('mpers-bst-norma').value = bstData?.norma ?? 0;
    const bstNormaUnit = bstData?.normaUnit || 'zi';
    document.getElementById('mpers-bst-norma-unit').value = bstNormaUnit;
    document.getElementById('mpers-bst-norma').max = bstNormaUnit === 'luna' ? 240 : 12;

    document.getElementById('mpers-emi-active').checked = !!emi;
    document.getElementById('mpers-emi-section').style.display = emi ? 'block' : 'none';
    document.getElementById('mpers-emi-norma').value = emi?.norma ?? 0;
    const emiNormaUnit = emi?.normaUnit || 'zi';
    document.getElementById('mpers-emi-norma-unit').value = emiNormaUnit;
    document.getElementById('mpers-emi-norma').max = emiNormaUnit === 'luna' ? 240 : 12;

    showModal('modal-person');
}

async function savePerson() {
    const name = document.getElementById('mpers-name').value.trim();
    const fname = document.getElementById('mpers-fname').value.trim();
    if (!name || !fname) { toast('⚠️', 'Completeaza Numele si Prenumele!'); return; }
    const id = document.getElementById('mpers-id').value || uid();

    const bstActive = document.getElementById('mpers-bst-active').checked;
    const emiActive = document.getElementById('mpers-emi-active').checked;

    if (!bstActive && !emiActive) {
        toast('⚠️', 'Selecteaza cel putin un angajator!'); return;
    }

    const employers = [];
    if (bstActive) {
        const bstNormaUnit = document.getElementById('mpers-bst-norma-unit').value;
        employers.push({
            id: 'BST',
            name: 'BlueSpace Technology SA',
            partner: 'LP-BST',
            norma: parseFloat(document.getElementById('mpers-bst-norma').value) || 0,
            normaUnit: bstNormaUnit,
        });
    }
    if (emiActive) {
        const emiNormaUnit = document.getElementById('mpers-emi-norma-unit').value;
        employers.push({
            id: 'EMI',
            name: 'EMI SHIELDING SRL',
            partner: 'P3-EMI',
            norma: parseFloat(document.getElementById('mpers-emi-norma').value) || 0,
            normaUnit: emiNormaUnit,
        });
    }

    const primaryEmployer = employers[0];
    const person = {
        id, name, fname,
        cnp: document.getElementById('mpers-cnp').value.trim(),
        type: document.getElementById('mpers-type').value,
        // MySMIS fields
        cim: document.getElementById('mpers-cim').value.trim(),
        aa: document.getElementById('mpers-aa').value.trim(),
        cor: document.getElementById('mpers-cor').value.trim(),
        employers,
        // backward compat
        partner: primaryEmployer?.partner || 'LP-BST',
        defaultOre: 8,
        defaultNorma: primaryEmployer?.norma ?? 0,
    };
    try {
        const saved = await apiPost('/persons', person);
        const idx = _persons.findIndex(p => p.id === saved.id);
        if (idx >= 0) _persons[idx] = saved; else _persons.push(saved);
        closeModal('modal-person');
        renderPersonsDB();
        if (document.getElementById('atp-list')) renderAtpList();
        toast('✅', `${name} ${fname} salvat!`);
    } catch (e) { toast('❌', 'Eroare: ' + e.message); }
}

async function deletePersonById(id) {
    const person = _persons.find(p => p.id === id);
    if (!person) return;
    if (!await confirmAction(`Ștergi pe ${person.name} ${person.fname} din baza de date?`)) return;
    try {
        await apiDelete(`/persons/${id}`);
        _persons = _persons.filter(p => p.id !== id);
        renderPersonsDB();
        toast('🗑️', 'Persoană ștearsă.');
    } catch (e) { toast('❌', 'Eroare: ' + e.message); }
}

function generateExcel() {
    const proj = _projects.find(p => p.id === currentProjectId);
    if (!proj) { toast('⚠️', 'Selectează un proiect!'); return; }
    const pids = Object.keys(pontajData);
    if (!pids.length) { toast('⚠️', `Nicio persoană pontată în ${MONTHS_RO[currentMonth - 1]} ${currentYear}!`); return; }

    const wb = XLSX.utils.book_new();
    const monthName = MONTHS_RO[currentMonth - 1];
    const totalDays = getDaysInMonth(currentYear, currentMonth);

    // ── Culori ──────────────────────────────────────────────────────
    const C = {
        headerBg: 'FFC000', // amber pentru numarul zilelor
        weekendBg: 'FFE0CC', // portocaliu deschis pentru weekend
        weekendFg: 'C63D00', // text portocaliu inchis weekend
        personBg: 'EBF3FB', // albastru pal — randul SMIS / ore
        normaBg: 'F7F7F7', // gri foarte deschis — norma de baza
        totalBg: 'DFF0D8', // verde pal — total
        titleBg: 'F0F4FF', // albastru foarte pal pentru antet
        border: 'BBBBBB',
        darkBg: 'D9E1F2', // albastru mediu pentru capul de tabel (text coloane)
        coFg: '0066CC', // CO text albastru
    };

    // ── Helper style ────────────────────────────────────────────────
    const brd = (s = 'thin', col = C.border) => ({
        top: { style: s, color: { rgb: col } }, bottom: { style: s, color: { rgb: col } },
        left: { style: s, color: { rgb: col } }, right: { style: s, color: { rgb: col } }
    });
    const sty = ({ bg, bold, sz, fg, h, v, wrap } = {}) => ({
        font: { name: 'Arial', sz: sz || 9, bold: !!bold, color: { rgb: fg || '000000' } },
        fill: bg ? { patternType: 'solid', fgColor: { rgb: bg } } : { patternType: 'none' },
        border: brd(),
        alignment: { horizontal: h || 'center', vertical: v || 'center', wrapText: !!wrap }
    });

    // ── Grupare pe tip ───────────────────────────────────────────────
    const types = [...new Set(pids.map(pid => {
        const cfg = getMemberConfig(proj, pid);
        return cfg?.type || _persons.find(p => p.id === pid)?.type || 'Cercetare';
    }))];

    types.forEach(type => {
        const grpPids = pids.filter(pid => {
            const cfg = getMemberConfig(proj, pid);
            return (cfg?.type || _persons.find(p => p.id === pid)?.type) === type;
        });
        const sheetName = `${String(currentMonth).padStart(2, '0')}.${currentYear} ${type}`.slice(0, 31);
        const dayNums = Array.from({ length: totalDays }, (_, i) => i + 1);
        const DATA_COL_START = 6; // prima coloana cu zilele
        const SUMCOLS = ['Total ore\nproiect'];
        const totalCols = DATA_COL_START + totalDays + SUMCOLS.length;

        // ── Rânduri de date ─────────────────────────────────────────
        const rows = [];

        // R0: gol (spatiu)
        rows.push(new Array(totalCols).fill(''));

        // R1: Adresa institutie (label | valoare) + titlu lista
        const r1 = new Array(totalCols).fill('');
        r1[1] = 'ADRESA INSTITUȚIEI:';
        r1[2] = proj.instAddr || '';
        r1[DATA_COL_START + 2] = `Lista pontaj persoane implicate în Implementarea Proiectului`;
        rows.push(r1);

        // R2: Titlu AFERENTE
        const r2 = new Array(totalCols).fill('');
        r2[DATA_COL_START + 2] = `AFERENTE CONTRACTULUI DE FINANȚARE Nr. ${proj.contract || ''} Cod SMIS ${proj.smis}`;
        rows.push(r2);

        // R3: Nume institutie (label | valoare) + Luna
        const r3 = new Array(totalCols).fill('');
        r3[1] = 'NUME INSTITUȚIEI:';
        r3[2] = proj.instName || '';
        r3[DATA_COL_START + Math.floor(totalDays / 2)] = `Luna ${monthName} ${currentYear}`;
        rows.push(r3);

        // R4: gol
        rows.push(new Array(totalCols).fill(''));

        // R5 (HEADER_ROW): capete coloane
        const headerRow = ['Nr.\ncrt.', 'Partener', 'CNP', 'Nume', 'Prenume', 'SMIS\nproiect',
            ...dayNums, ...SUMCOLS];
        rows.push(headerRow);

        const HEADER_RI = rows.length - 1; // 0-based index al randului cu numerele zilelor

        // R data: cate 3 randuri per persoana
        const PERSON_DATA_START_RI = rows.length;
        grpPids.forEach((pid, i) => {
            const person = _persons.find(p => p.id === pid); if (!person) return;
            const cfg = getMemberConfig(proj, pid);
            const partner = cfg?.partner || person.partner || '';
            const pd = pontajData[pid] || { days: {}, norma: {} };

            const rowO = [i + 1, partner, person.cnp || '', person.name, person.fname, proj.smis];
            const rowN = ['', '', '', '', '', 'Norma de baza'];
            const rowT = ['', '', '', '', '', 'Total'];
            let so = 0, sn = 0, st = 0;
            let coCnt = 0, cmCnt = 0, cedCnt = 0, cfpCnt = 0, absCnt = 0, cicCnt = 0;

            dayNums.forEach(d => {
                const ov = pd.days?.[d] ?? 0, nv = pd.norma?.[d] ?? 0;
                const os = String(ov).toUpperCase(), ns = String(nv).toUpperCase();
                rowO.push(['CO', 'CM', 'CED', 'CFP', 'ABS', 'CIC'].includes(os) ? os : (parseFloat(ov) || 0));
                rowN.push(parseFloat(nv) || 0);
                if (!['CO', 'CM', 'CED', 'CFP', 'ABS', 'CIC'].includes(os)) so += (parseFloat(ov) || 0);
                if (!['CO', 'CM', 'CED', 'CFP', 'ABS', 'CIC'].includes(ns)) sn += (parseFloat(nv) || 0);
                const tv = ['CO', 'CM', 'CED', 'CFP', 'ABS', 'CIC'].includes(os) ? os
                    : (parseFloat(ov) || 0) + (parseFloat(nv) || 0);
                rowT.push(typeof tv === 'number' ? tv : '');
                if (typeof tv === 'number') st += tv;
                if (os === 'CO') coCnt++; if (os === 'CM') cmCnt++;
                if (os === 'CED') cedCnt++; if (os === 'CFP') cfpCnt++;
                if (os === 'ABS') absCnt++; if (os === 'CIC') cicCnt++;
            });
            rowO.push(so);
            rowN.push(sn);
            rowT.push(st);
            rows.push(rowO, rowN, rowT);
        });

        // Footer INTOCMIT / VERIFICAT
        const footerR1 = new Array(totalCols).fill('');
        footerR1[3] = 'INTOCMIT'; footerR1[4] = proj.intocmit || '';
        footerR1[DATA_COL_START + totalDays + 1] = 'VERIFICAT';
        footerR1[DATA_COL_START + totalDays + 2] = 'Responsabil proiect';
        rows.push(footerR1);
        const footerR2 = new Array(totalCols).fill('');
        footerR2[DATA_COL_START + totalDays + 2] = proj.verificat || '';
        rows.push(footerR2);

        // ── Construim sheet ─────────────────────────────────────────
        const ws = XLSX.utils.aoa_to_sheet(rows);

        // ── Dimensiuni coloane ──────────────────────────────────────
        const cols = [
            { wch: 5 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 11 },
        ];
        for (let d = 0; d < totalDays; d++) cols.push({ wch: 3.8 });
        SUMCOLS.forEach((sc, i) => cols.push({ wch: i === 0 ? 9 : 5.5 }));
        ws['!cols'] = cols;

        // ── Inaltimi randuri ────────────────────────────────────────
        ws['!rows'] = rows.map((_, ri) => ({
            hpx: ri === HEADER_RI ? 32 : (ri < HEADER_RI ? 20 : 18)
        }));

        // ── Celule unite (merge) ────────────────────────────────────
        const merges = [];
        // Titlu R1-R3: merge pe coloanele de date
        const titleEnd = totalCols - 1;
        merges.push({ s: { r: 1, c: DATA_COL_START + 2 }, e: { r: 1, c: titleEnd } });
        merges.push({ s: { r: 2, c: DATA_COL_START + 2 }, e: { r: 2, c: titleEnd } });
        // Luna: merge pe jumatatea din dreapta
        const lunaC = DATA_COL_START + Math.floor(totalDays / 2);
        merges.push({ s: { r: 3, c: lunaC }, e: { r: 3, c: titleEnd } });
        // Merge cel 5 coloane de info per persoana pe 3 randuri
        let prRow = PERSON_DATA_START_RI;
        grpPids.forEach(pid => {
            if (!_persons.find(p => p.id === pid)) return;
            [0, 1, 2, 3, 4].forEach(ci => {
                merges.push({ s: { r: prRow, c: ci }, e: { r: prRow + 2, c: ci } });
            });
            prRow += 3;
        });
        ws['!merges'] = merges;

        // ── Stilizare celule ────────────────────────────────────────
        const encAddr = (r, c) => XLSX.utils.encode_cell({ r, c });
        const rng = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');

        for (let r = rng.s.r; r <= rng.e.r; r++) {
            for (let c = rng.s.c; c <= rng.e.c; c++) {
                const ca = encAddr(r, c);
                if (!ws[ca]) ws[ca] = { v: '', t: 's' };

                const isDayCol = c >= DATA_COL_START && c < DATA_COL_START + totalDays;
                const dayNum = isDayCol ? (c - DATA_COL_START + 1) : null;
                const wknd = dayNum ? isWeekend(currentYear, currentMonth, dayNum) : false;

                let rowType = -1;
                if (r >= PERSON_DATA_START_RI) {
                    const relRow = r - PERSON_DATA_START_RI;
                    if (relRow < grpPids.length * 3) rowType = relRow % 3;
                }

                let s;
                if (r === HEADER_RI) {
                    // Rand cu numerele zilelor
                    s = sty({
                        bg: wknd ? C.weekendBg : C.headerBg, bold: true, sz: 8,
                        fg: wknd ? C.weekendFg : '1A1A1A', wrap: true
                    });
                    s.border = brd('medium', '888888');
                } else if (r < HEADER_RI) {
                    // Antet (titluri)
                    s = sty({
                        h: 'left', sz: c >= DATA_COL_START + 2 && r >= 1 && r <= 2 ? 10 : 9,
                        bold: r >= 1 && r <= 3 && c >= DATA_COL_START + 2
                    });
                    s.border = brd('hair', 'DDDDDD');
                    if (r === 3 && c >= lunaC) { s.font.sz = 12; s.font.bold = true; s.alignment.horizontal = 'center'; }
                } else if (rowType === 0) {
                    // Rand SMIS / ore lucrate
                    const cellVal = String(ws[ca]?.v || '').toUpperCase();
                    const isCod = ['CO', 'CM', 'CED', 'CFP', 'ABS', 'CIC'].includes(cellVal);
                    s = sty({
                        bg: wknd && isDayCol ? C.weekendBg : C.personBg,
                        fg: isCod ? C.coFg : (wknd && isDayCol ? C.weekendFg : '000000'),
                        bold: isCod, sz: isCod ? 8 : 9
                    });
                    if (c < DATA_COL_START) { s.alignment.horizontal = 'left'; }
                    s.border = brd('thin', C.border);
                    // Bordura groasa jos la randul de ore (desparte de norma)
                } else if (rowType === 1) {
                    // Rand norma de baza
                    s = sty({
                        bg: wknd && isDayCol ? C.weekendBg : C.normaBg,
                        fg: wknd && isDayCol ? C.weekendFg : '666666', sz: 8
                    });
                    if (c < DATA_COL_START) s.alignment.horizontal = 'left';
                } else if (rowType === 2) {
                    // Rand total
                    s = sty({
                        bg: wknd && isDayCol ? C.weekendBg : C.totalBg,
                        fg: wknd && isDayCol ? C.weekendFg : '1A3A1A', bold: c === DATA_COL_START + totalDays
                    });
                    s.border = brd('medium', '999999');
                    if (c < DATA_COL_START) { s.alignment.horizontal = 'left'; s.font.bold = true; }
                } else {
                    // Footer
                    s = sty({ h: 'left', bold: [3, DATA_COL_START + totalDays + 1].includes(c) });
                    s.border = brd('hair', 'EEEEEE');
                }
                ws[ca].s = s;
            }
        }

        ws['!cols'] = cols;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const fname = `Pontaj_${String(currentMonth).padStart(2, '0')}_${currentYear}_SMIS_${proj.smis}.xlsx`;
    try {
        // xlsx-style suporta doar 'binary', nu 'array' — convertim manual la ArrayBuffer
        const wbBin = XLSXStyle.write(wb, { bookType: 'xlsx', type: 'binary' });
        const buf = new ArrayBuffer(wbBin.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < wbBin.length; i++) view[i] = wbBin.charCodeAt(i) & 0xFF;
        triggerFileDownload(
            new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            fname
        );
        toast('📊', `Excel generat: ${fname}`);
    } catch (e) { toast('❌', 'Eroare Excel: ' + e.message); }
}





// ---------------------------------------------------------------------------
//  confirmAction — non-blocking alternative to window.confirm()
//  Returns a Promise<boolean> resolved when user clicks Yes / No.
//  Uses the existing toast container; renders a small confirm card above it.
// ---------------------------------------------------------------------------
function confirmAction(message) {
    return new Promise((resolve) => {
        const existing = document.getElementById('_confirm-overlay');
        if (existing) existing.remove(); // prevent stacking

        const el = document.createElement('div');
        el.id = '_confirm-overlay';
        el.style.cssText = 'position:fixed;bottom:80px;right:24px;z-index:9999;background:var(--surface2,#1e2235);'
            + 'border:1px solid var(--border,#2a3050);border-radius:12px;padding:16px 20px;max-width:340px;'
            + 'box-shadow:0 8px 32px rgba(0,0,0,.5);font-family:Inter,sans-serif;font-size:14px;color:var(--text,#e2e8f0)';
        el.innerHTML = `
            <p style="margin:0 0 14px;line-height:1.5">${message}</p>
            <div style="display:flex;gap:10px;justify-content:flex-end">
                <button id="_confirm-no"  class="btn btn-ghost btn-sm">Anulare</button>
                <button id="_confirm-yes" class="btn btn-danger btn-sm">✓ Confirm</button>
            </div>`;
        document.body.appendChild(el);

        const cleanup = (result) => { el.remove(); resolve(result); };
        el.querySelector('#_confirm-yes').addEventListener('click', () => cleanup(true), { once: true });
        el.querySelector('#_confirm-no').addEventListener('click', () => cleanup(false), { once: true });
    });
}

// ---------------------------------------------------------------------------
//  triggerFileDownload
//  Prefers File System Access API (showSaveFilePicker) for a proper Save-As
//  dialog. Falls back to the standard <a download> approach for browsers that
//  do not support it or when called from a non-secure context.
// ---------------------------------------------------------------------------
async function triggerFileDownload(blob, filename) {
    if ('showSaveFilePicker' in window) {
        try {
            const ext = filename.split('.').pop().toLowerCase();
            const mimes = {
                xlsx: { description: 'Fișier Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } },
                zip: { description: 'Arhivă ZIP', accept: { 'application/zip': ['.zip'] } },
                json: { description: 'Fișier JSON', accept: { 'application/json': ['.json'] } },
            };
            const types = mimes[ext] ? [mimes[ext]] : [];
            const handle = await window.showSaveFilePicker({ suggestedName: filename, ...(types.length && { types }) });
            const writer = await handle.createWritable();
            await writer.write(blob);
            await writer.close();
            return;
        } catch (err) {
            if (err.name === 'AbortError') return; // user cancelled — do nothing
            // Any other error (e.g. SecurityError): fall through to <a> fallback
        }
    }
    // Fallback: programmatic click on a hidden anchor
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Revoke after the browser has had one frame to initiate the download
    requestAnimationFrame(() => { document.body.removeChild(a); URL.revokeObjectURL(url); });
}

// ============================================================
//  EXPORT / IMPORT
// ============================================================
function exportDB() {
    window.open(API + '/export', '_blank');
    toast('⬇️', 'Baza de date exportată!');
}
function importDB() { document.getElementById('import-file').click(); }
async function doImport(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            await apiPost('/import', data);
            await loadAll();
            renderProjects();
            toast('⬆️', 'Baza de date importată cu succes!');
        } catch (err) { toast('❌', 'Fișier invalid sau eroare server!'); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ============================================================
//  HISTORY
// ============================================================
function renderHistory() {
    const sel = document.getElementById('hist-proj-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Selectează proiect --</option>';
    _projects.forEach(p => sel.innerHTML += `<option value="${p.id}">${p.name} (SMIS ${p.smis})</option>`);
    if (currentProjectId) sel.value = currentProjectId;
    renderHistoryTable();
}

async function renderHistoryTable() {
    const sel = document.getElementById('hist-proj-select');
    const projId = sel?.value;
    const content = document.getElementById('hist-content');
    if (!projId) { content.innerHTML = '<div class="empty-state"><div class="empty-icon">📊</div><h2>Selectează un proiect</h2></div>'; return; }
    const proj = _projects.find(p => p.id === projId);
    let allData = {};
    try { allData = await apiGet(`/pontaj/${projId}/all`); } catch { }
    const months = [];
    Object.keys(allData).forEach(k => {
        const parts = k.replace(`${projId}_`, '').split('_');
        if (parts.length >= 2) {
            const y = parseInt(parts[0]), m = parseInt(parts[1]);
            if (!isNaN(y) && !isNaN(m) && !months.find(x => x.y === y && x.m === m)) months.push({ y, m });
        }
    });
    months.sort((a, b) => a.y !== b.y ? a.y - b.y : a.m - b.m);

    // Filtram lunile care nu au nicio ora reala pontata (fara sa afisam luni cu fisiere "goale")
    const monthsWithData = months.filter(({ y, m }) => {
        const pd = allData[`${projId}_${y}_${m}`] || {};
        return Object.values(pd).some(personData => sumOre(personData?.days || {}) > 0);
    });
    const months2 = monthsWithData; // alias clar

    if (!months2.length) { content.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><h2>Niciun pontaj salvat</h2></div>'; return; }

    // FILTRAM in asa fel incat istoricul afiseaza DOAR membrii curenti ai proiectului.
    // Daca o persoana a fost scoasa definitiv (X membri), orele ei se "rad" si nu mai apar in istoric.
    const allPids = new Set();
    const activeMemberIds = new Set((proj.members || []).map(m => m.personId));

    months2.forEach(({ y, m }) => Object.keys(allData[`${projId}_${y}_${m}`] || {}).forEach(pid => {
        const pd = allData[`${projId}_${y}_${m}`][pid];
        if (sumOre(pd?.days || {}) > 0 && activeMemberIds.has(pid)) allPids.add(pid);
    }));

    const persons = [...allPids].map(pid => _persons.find(p => p.id === pid)).filter(Boolean);

    // Daca toti membrii au fost scosi, afisam "gol"
    if (!persons.length) { content.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><h2>Nicio persoană în proiect cu ore înregistrate.</h2></div>'; return; }

    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:15px;margin-top:-35px">
        <button class="btn btn-ghost" onclick="renderHistoryTable()" style="border:1px solid var(--border);color:var(--text-muted)">🔄 Reîncarcă istoricul</button>
    </div>
    <div style="overflow-x:auto"><table class="persons-table" style="min-width:600px"><thead><tr>
      <th>Persoană</th><th>Companie</th><th>Tip</th>`;
    months2.forEach(({ y, m }) => html += `<th style="text-align:center">${MONTHS_RO[m - 1]}<br><small>${y}</small></th>`);
    html += `<th style="text-align:center">TOTAL</th></tr></thead><tbody>`;
    persons.forEach(p => {
        let grand = 0;
        const cfg = getMemberConfig(proj, p.id);
        const partner = cfg?.partner || p.partner || '–';
        const type = cfg?.type || p.type || '–';
        html += `<tr><td><strong>${p.name} ${p.fname}</strong></td><td style="font-size:11px;color:var(--text-muted)">${partner}</td>
        <td><span class="tag ${type === 'Management' ? 'tag-mgt' : 'tag-cer'}">${type}</span></td>`;
        months2.forEach(({ y, m }) => {
            const pd = allData[`${projId}_${y}_${m}`] || {};
            const ore = sumOre(pd[p.id]?.days || {}); grand += ore;
            html += `<td style="text-align:center"><span style="${ore > 0 ? 'color:var(--accent2);font-weight:700' : 'color:var(--text-muted)'};cursor:pointer"
              onclick="openProjectMonth('${projId}','${y}','${m}')">${ore > 0 ? ore : '–'}</span></td>`;
        });
        html += `<td style="text-align:center;font-weight:800;color:var(--green)">${grand}</td></tr>`;
    });
    let grandTotal = 0;
    html += `<tr style="border-top:2px solid var(--border)"><td colspan="3"><strong>Total proiect</strong></td>`;
    months2.forEach(({ y, m }) => {
        const pd = allData[`${projId}_${y}_${m}`] || {};
        const mT = persons.reduce((acc, p) => acc + sumOre(pd[p.id]?.days || {}), 0);
        grandTotal += mT;
        html += `<td style="text-align:center;font-weight:700;color:var(--gold)">${mT > 0 ? mT : '–'}</td>`;
    });
    html += `<td style="text-align:center;font-weight:800;color:var(--gold)">${grandTotal}</td></tr></tbody></table></div>`;
    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:20px">
      <div class="card"><div class="stat-mini-label">Luni cu pontaj</div><div class="stat-mini-val">${months2.length}</div></div>
      <div class="card"><div class="stat-mini-label">Total ore</div><div class="stat-mini-val" style="color:var(--accent2)">${grandTotal}</div></div>
      <div class="card"><div class="stat-mini-label">Persoane active</div><div class="stat-mini-val">${persons.length}</div></div>
    </div>`;
    content.innerHTML = html;
}

function openProjectMonth(projId, y, m) {
    currentProjectId = projId; currentYear = +y; currentMonth = +m;
    const proj = _projects.find(p => p.id === projId);
    document.getElementById('pd-title').textContent = proj?.name || '';
    document.getElementById('pd-sub').textContent = `SMIS ${proj?.smis} · ${proj?.contract || ''} · ${proj?.instName || proj?.partner}`;
    document.getElementById('pd-month').value = currentMonth;
    document.getElementById('pd-year').value = currentYear;
    loadPontajMonth(); goToRaw('page-project-detail');
}

// ============================================================
//  MODAL / TOAST / UTILS
// ============================================================
function showModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
let toastTimer;
function toast(icon, msg) {
    const t = document.getElementById('toast');
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-msg').textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}
function getDaysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
function isWeekend(y, m, d) { const dw = new Date(y, m - 1, d).getDay(); return dw === 0 || dw === 6; }
function getWorkdays(y, m) { let c = 0, t = getDaysInMonth(y, m); for (let d = 1; d <= t; d++) if (!isWeekend(y, m, d)) c++; return c; }
function sumOre(daysObj) {
    return Object.values(daysObj || {}).reduce((a, v) => {
        if (String(v).toUpperCase() === 'CO') return a;
        return a + (parseFloat(v) || 0);
    }, 0);
}

// ============================================================
//  INDIVIDUAL PONTAJ & RAPORT
// ============================================================
let currentIndivPerson = null;
let currentIndivData = {}; // Format: { projId: { days: {}, intervals: {}, activities: {} } }
let currentIndivProjects = [];

function renderIndividualSelects() {
    const selPerson = document.getElementById('indiv-person');
    selPerson.innerHTML = '<option value="">-- Alege Persoana --</option>';
    _persons.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
        selPerson.innerHTML += `<option value="${p.id}">${p.name} ${p.fname}</option>`;
    });
    document.getElementById('indiv-grid-container').innerHTML = `
        <div class="empty-state"><div class="empty-icon">👥</div><h2>Alege o persoană</h2><p>Selectează o persoană din meniul de mai sus pentru a edita tabelul său de pontaj</p></div>
    `;
}

async function renderIndividualGrid() {
    const personId = document.getElementById('indiv-person').value;
    const year = parseInt(document.getElementById('indiv-year').value) || new Date().getFullYear();
    const month = parseInt(document.getElementById('indiv-month').value) || (new Date().getMonth() + 1);
    const container = document.getElementById('indiv-grid-container');

    if (!personId) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><h2>Alege o persoană</h2></div>`;
        return;
    }

    currentIndivPerson = _persons.find(p => p.id === personId);
    if (!currentIndivPerson) return;

    container.innerHTML = `<div style="padding:40px;text-align:center;">Se încarcă datele...</div>`;

    // Obtinem proiectele in care este persoana implicata (desi in noul view putem arata direct toate proiectele per persoana)
    // Vom aduce TOATE proiectele si vom vedea in care e bagat
    let activeProjects = [];
    currentIndivData = {};

    for (let proj of _projects) {
        if (proj.members && proj.members.some(m => m.personId === personId)) {
            activeProjects.push(proj);
            try {
                const res = await fetch(`${API}/pontaj/${proj.id}/${year}/${month}`);
                if (res.ok) {
                    const monthData = await res.json();
                    if (monthData[personId]) {
                        currentIndivData[proj.id] = monthData[personId];
                    } else {
                        currentIndivData[proj.id] = { days: {}, intervals: {}, activities: {} };
                    }
                }
            } catch (e) {
                currentIndivData[proj.id] = { days: {}, intervals: {}, activities: {} };
            }
        }
    }

    currentIndivProjects = activeProjects;

    if (activeProjects.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h2>Niciun proiect alocat</h2><p>Această persoană nu este membru în niciun proiect. Adaug-o dintr-un proiect.</p></div>`;
        return;
    }

    const totalDays = getDaysInMonth(year, month);
    let html = `
    <table class="persons-table" style="min-width: 900px; font-size:12px;">
        <thead>
            <tr>
                <th style="width: 40px; text-align:center;">Ziua</th>
                <th style="width: 80px; text-align:center;">Data</th>
    `;

    // Headers proiecte
    activeProjects.forEach(proj => {
        html += `<th style="border-left:2px solid var(--border);">Ore ${proj.name}</th>
                 <th>Interval ${proj.name}</th>
                 <th style="width:300px;">Activitate ${proj.name}</th>`;
    });

    html += `</tr></thead><tbody>`;

    for (let d = 1; d <= totalDays; d++) {
        const isWe = isWeekend(year, month, d);
        const trClass = isWe ? 'style="background:rgba(231,76,60,0.05);"' : '';
        const dayStr = String(d).padStart(2, '0') + '.' + String(month).padStart(2, '0') + '.' + year;
        const dwStr = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'][new Date(year, month - 1, d).getDay()];

        html += `<tr ${trClass}>
            <td style="text-align:center;font-weight:bold;color:${isWe ? '#e74c3c' : 'var(--text)'}">${dwStr}</td>
            <td style="text-align:center;color:var(--text-muted);">${dayStr}</td>
        `;

        activeProjects.forEach(proj => {
            const dp = currentIndivData[proj.id] || { days: {}, intervals: {}, activities: {} };
            const valH = dp.days[d] || (dp.days[d] === 0 ? '0' : '');
            const valI = dp.intervals?.[d] || '';
            const valA = dp.activities?.[d] || '';

            html += `
                <td style="border-left:2px solid var(--border);">
                    <input type="text" id="ih_${proj.id}_${d}" value="${valH}" 
                           style="width:100%;text-align:center;padding:4px;border-radius:4px;background:var(--surface);border:1px solid ${isWe ? '#e74c3c40' : 'var(--border)'};" 
                           placeholder="${isWe ? '-' : '0'}" ${isWe ? '' : 'class="indiv-h-input"'} />
                </td>
                <td>
                    <input type="text" id="ii_${proj.id}_${d}" value="${valI}" 
                           style="width:100%;text-align:center;padding:4px;border-radius:4px;background:var(--surface);border:1px solid var(--border);" 
                           placeholder="ex: 08-16" />
                </td>
                <td>
                    <textarea id="ia_${proj.id}_${d}" style="width:100%;min-height:30px;height:30px;padding:4px;border-radius:4px;background:var(--surface);border:1px solid var(--border);resize:vertical;" placeholder="Descriere activare...">${valA}</textarea>
                </td>
            `;
        });

        html += `</tr>`;
    }

    html += `</tbody></table>`;
    container.innerHTML = html;
}

window.saveIndividualPontaj = async function () {
    if (!currentIndivPerson || !currentIndivProjects.length) {
        toast('⚠️', 'Nu e aleasă nicio persoană pt salvare.'); return;
    }
    const year = parseInt(document.getElementById('indiv-year').value);
    const month = parseInt(document.getElementById('indiv-month').value);
    const totalDays = getDaysInMonth(year, month);
    const btn = document.querySelector('button[onclick="saveIndividualPontaj()"]');
    const oldText = btn.textContent;
    btn.textContent = '⏳ Se salvează...';
    btn.disabled = true;

    try {
        // --- 1) VALIDARE 12h MAX cumulat pe zi (CRITICAL) ---
        for (let d = 1; d <= totalDays; d++) {
            let dailySum = 0;
            for (let proj of currentIndivProjects) {
                let vH = document.getElementById(`ih_${proj.id}_${d}`).value.trim();
                let nr = parseFloat(vH);
                if (!isNaN(nr) && vH.toUpperCase() !== 'CO' && vH.toUpperCase() !== 'CM') {
                    dailySum += nr;
                }
            }
            if (dailySum > 12) {
                toast('❌', `Refuzat! În ziua ${d} s-au cumulat ${dailySum} ore (Maxim permis: 12h). Verifică erorile și salvează din nou.`);
                // Return to stop saving
                btn.textContent = oldText;
                btn.disabled = false;
                return;
            }
        }

        // --- 2) SALVARE PROPRIU-ZISA ---
        for (let proj of currentIndivProjects) {
            let pData = currentIndivData[proj.id] || { days: {}, intervals: {}, activities: {} };
            if (!pData.days) pData.days = {};
            if (!pData.intervals) pData.intervals = {};
            if (!pData.activities) pData.activities = {};

            for (let d = 1; d <= totalDays; d++) {
                let vH = document.getElementById(`ih_${proj.id}_${d}`).value.trim();
                if (vH.toUpperCase() === 'CO') {
                    pData.days[d] = 'CO';
                } else if (vH.toUpperCase() === 'CM') {
                    pData.days[d] = 'CM';
                } else {
                    let nr = parseFloat(vH);
                    if (!isNaN(nr)) pData.days[d] = nr;
                    else delete pData.days[d];
                }

                let vI = document.getElementById(`ii_${proj.id}_${d}`).value.trim();
                pData.intervals[d] = vI;

                let vA = document.getElementById(`ia_${proj.id}_${d}`).value.trim();
                pData.activities[d] = vA;
            }

            // Trimite cerere update catre API pentru acest proiect specific
            // Daca pData are ceva, facem rost de monthData de la server mai intai ca sa nu suprascriem aiurea alti colegi in acelasi proiect
            const r1 = await fetch(`${API}/pontaj/${proj.id}/${year}/${month}`);
            let serverMontData = {};
            if (r1.ok) serverMontData = await r1.json();

            // Suprascriem doar pt omul nostru
            serverMontData[currentIndivPerson.id] = pData;

            // Post inapoi
            await apiPost(`/pontaj/${proj.id}/${year}/${month}`, serverMontData);
        }

        toast('✅', 'Datele au fost salvate cu succes pe toate proiectele!');
    } catch (e) {
        console.error(e);
        toast('❌', 'Eroare la salvare: ' + e.message);
    } finally {
        btn.textContent = oldText;
        btn.disabled = false;
    }
};

window.generateIndividualExcel = function () {
    if (!currentIndivPerson) {
        toast('⚠️', 'Alege o persoană mai întâi!');
        return;
    }
    if (typeof window.generateFiseAll === 'function') {
        const btn = document.querySelector('button[onclick="generateIndividualExcel()"]');
        const oldT = btn.textContent;
        btn.textContent = "⏳ Se generează...";
        btn.disabled = true;

        window.generateFiseAll(currentIndivPerson.id).finally(() => {
            btn.textContent = oldT;
            btn.disabled = false;
        });
    } else {
        toast('⚠️', 'Nu găsesc modulul generator!');
    }
};

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // NOTE: Modalele se inchid NUMAI prin butoanele explicite (Anulare / X).
    // Am eliminat inchiderea la Escape si la click pe fundal pentru a preveni
    // pierderea accidentala a datelor introduse in formulare.
    await loadAll();
    goTo('projects');
});
