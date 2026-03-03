// ============================================================
//  PONTAJ MANAGER — server.js
//  Backend REST API cu Node.js built-in (fara dependente externe)
//  Date salvate ca JSON pe disc in ./data/
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// ============================================================
//  INIT: creeaza folderele de date daca nu exista
// ============================================================
function ensureDirs() {
    [DATA_DIR, path.join(DATA_DIR, 'pontaj')].forEach(d => {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });
    // Fisiere JSON initiale
    const files = { 'projects.json': [], 'persons.json': [] };
    Object.entries(files).forEach(([f, def]) => {
        const fp = path.join(DATA_DIR, f);
        if (!fs.existsSync(fp)) fs.writeFileSync(fp, JSON.stringify(def, null, 2));
    });
}

// ============================================================
//  HELPERS: citire/scriere JSON
// ============================================================
function readJSON(filePath) {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
    catch { return null; }
}
function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ============================================================
//  SERVE FISIERE STATICE
// ============================================================
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};
function serveStatic(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    if (!fs.existsSync(filePath)) {
        res.writeHead(404); res.end('Not found'); return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
}

// ============================================================
//  RESPONSE HELPERS
// ============================================================
function json(res, code, data) {
    res.writeHead(code, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
}
function body(req) {
    return new Promise((resolve, reject) => {
        let buf = '';
        req.on('data', c => buf += c);
        req.on('end', () => {
            try { resolve(JSON.parse(buf || '{}')); }
            catch { resolve({}); }
        });
        req.on('error', reject);
    });
}

// ============================================================
//  UID
// ============================================================
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ============================================================
//  ROUTER
// ============================================================
const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;
    const method = req.method;

    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end(); return;
    }

    // ── API ROUTES ──────────────────────────────────────────

    // --- PROJECTS ---
    if (pathname === '/api/projects') {
        if (method === 'GET') {
            const projects = readJSON(path.join(DATA_DIR, 'projects.json')) || [];
            return json(res, 200, projects);
        }
        if (method === 'POST') {
            const data = await body(req);
            const projects = readJSON(path.join(DATA_DIR, 'projects.json')) || [];
            data.id = data.id || uid();
            if (!data.members) data.members = [];
            const idx = projects.findIndex(p => p.id === data.id);
            if (idx >= 0) projects[idx] = data;
            else projects.push(data);
            writeJSON(path.join(DATA_DIR, 'projects.json'), projects);
            return json(res, 200, data);
        }
    }
    const projMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
    if (projMatch) {
        const id = projMatch[1];
        if (method === 'DELETE') {
            const projects = (readJSON(path.join(DATA_DIR, 'projects.json')) || []).filter(p => p.id !== id);
            writeJSON(path.join(DATA_DIR, 'projects.json'), projects);
            return json(res, 200, { ok: true });
        }
    }

    // --- PERSONS ---
    if (pathname === '/api/persons') {
        if (method === 'GET') {
            const persons = readJSON(path.join(DATA_DIR, 'persons.json')) || [];
            return json(res, 200, persons);
        }
        if (method === 'POST') {
            const data = await body(req);
            const persons = readJSON(path.join(DATA_DIR, 'persons.json')) || [];
            data.id = data.id || uid();
            const idx = persons.findIndex(p => p.id === data.id);
            if (idx >= 0) persons[idx] = data;
            else persons.push(data);
            writeJSON(path.join(DATA_DIR, 'persons.json'), persons);
            return json(res, 200, data);
        }
    }
    const personMatch = pathname.match(/^\/api\/persons\/([^/]+)$/);
    if (personMatch) {
        const id = personMatch[1];
        if (method === 'DELETE') {
            const persons = (readJSON(path.join(DATA_DIR, 'persons.json')) || []).filter(p => p.id !== id);
            writeJSON(path.join(DATA_DIR, 'persons.json'), persons);
            return json(res, 200, { ok: true });
        }
    }

    // --- PONTAJ ---
    // GET/POST /api/pontaj/:projId/:year/:month
    const pontajMatch = pathname.match(/^\/api\/pontaj\/([^/]+)\/(\d+)\/(\d+)$/);
    if (pontajMatch) {
        const [, projId, year, month] = pontajMatch;
        const pontajFile = path.join(DATA_DIR, 'pontaj', `${projId}_${year}_${month}.json`);
        if (method === 'GET') {
            const data = readJSON(pontajFile) || {};
            return json(res, 200, data);
        }
        if (method === 'POST') {
            const data = await body(req);
            writeJSON(pontajFile, data);
            return json(res, 200, { ok: true });
        }
    }

    // GET /api/pontaj/:projId/all — toate lunile cu date pt proiect
    const pontajAllMatch = pathname.match(/^\/api\/pontaj\/([^/]+)\/all$/);
    if (pontajAllMatch) {
        const projId = pontajAllMatch[1];
        const pontajDir = path.join(DATA_DIR, 'pontaj');
        const files = fs.readdirSync(pontajDir).filter(f => f.startsWith(`${projId}_`));
        const result = {};
        files.forEach(f => {
            const key = f.replace('.json', '');
            result[key] = readJSON(path.join(pontajDir, f)) || {};
        });
        return json(res, 200, result);
    }

    // --- EXPORT DB ---
    if (pathname === '/api/export' && method === 'GET') {
        const projects = readJSON(path.join(DATA_DIR, 'projects.json')) || [];
        const persons = readJSON(path.join(DATA_DIR, 'persons.json')) || [];
        const pontajDir = path.join(DATA_DIR, 'pontaj');
        const pontaj = {};
        fs.readdirSync(pontajDir).forEach(f => {
            pontaj[`pm_pontaj_${f.replace('.json', '')}`] = readJSON(path.join(pontajDir, f));
        });
        const exportData = { projects, persons, pontaj, exportedAt: new Date().toISOString() };
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="pontaj_backup_${new Date().toISOString().slice(0, 10)}.json"`,
            'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(exportData, null, 2));
        return;
    }

    // --- IMPORT DB ---
    if (pathname === '/api/import' && method === 'POST') {
        const data = await body(req);
        if (data.projects) writeJSON(path.join(DATA_DIR, 'projects.json'), data.projects);
        if (data.persons) writeJSON(path.join(DATA_DIR, 'persons.json'), data.persons);
        if (data.pontaj) {
            Object.entries(data.pontaj).forEach(([k, v]) => {
                // k = "pm_pontaj_projId_year_month"
                const key = k.replace('pm_pontaj_', '').replace('pm_j_', '');
                writeJSON(path.join(DATA_DIR, 'pontaj', `${key}.json`), v);
            });
        }
        return json(res, 200, { ok: true, message: 'Import realizat cu succes!' });
    }

    // ── STATIC FILES ────────────────────────────────────────
    if (pathname === '/' || pathname === '') {
        return serveStatic(res, path.join(PUBLIC_DIR, 'index.html'));
    }
    // Serveste orice alt fisier din public/
    const staticPath = path.join(PUBLIC_DIR, pathname);
    if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
        return serveStatic(res, staticPath);
    }
    // Fallback la index.html
    return serveStatic(res, path.join(PUBLIC_DIR, 'index.html'));
});

// ============================================================
//  START
// ============================================================
ensureDirs();
server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  ██████╗  ██████╗ ███╗   ██╗████████╗ █████╗      ██╗');
    console.log('  ██╔══██╗██╔═══██╗████╗  ██║╚══██╔══╝██╔══██╗     ██║');
    console.log('  ██████╔╝██║   ██║██╔██╗ ██║   ██║   ███████║     ██║');
    console.log('  ██╔═══╝ ██║   ██║██║╚██╗██║   ██║   ██╔══██║██   ██║');
    console.log('  ██║     ╚██████╔╝██║ ╚████║   ██║   ██║  ██║╚█████╔╝');
    console.log('  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚════╝ ');
    console.log('');
    console.log(`  Pontaj Manager v2.0 — Server pornit!`);
    console.log(`  Local:    http://localhost:${PORT}`);
    console.log(`  Retea:    http://<IP-ul-tau>:${PORT}`);
    console.log('');
    console.log('  Date salvate in: ./data/');
    console.log('  Apasa Ctrl+C pentru a opri serverul.');
    console.log('');
});
