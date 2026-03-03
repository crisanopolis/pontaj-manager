// ============================================================
//  PONTAJ MANAGER — server.js (Express v2)
//  Backend REST API modular cu Express.js
//  Compatibil 100% cu frontEnd-ul existent (aceleasi rute API)
// ============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');

// ── Utils & Services ─────────────────────────────────────────
const { ensureDirs } = require('./utils/fileStore');
const ProjectService = require('./services/projectService');
const PersonService = require('./services/personService');
const PontajService = require('./services/pontajService');

// ── Middleware ───────────────────────────────────────────────
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

// ── Routes ───────────────────────────────────────────────────
const projectsRouter = require('./routes/projects');
const personsRouter = require('./routes/persons');
const pontajRouter = require('./routes/pontaj');
const dashboardRouter = require('./routes/dashboard');
const backupRouter = require('./routes/backup');

// ── Config ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, '..', 'data');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// ── Initializare ─────────────────────────────────────────────
ensureDirs(DATA_DIR);

// ── Instantiere servicii ─────────────────────────────────────
const projectService = new ProjectService(DATA_DIR);
const personService = new PersonService(DATA_DIR);
const pontajService = new PontajService(DATA_DIR);

// ============================================================
//  APP EXPRESS
// ============================================================
const app = express();

// ── Middleware global ────────────────────────────────────────
app.use(require('cors')());                         // CORS permisiv (dev)
app.use(express.json({ limit: '10mb' }));          // Parse JSON body
app.use(requestLogger);                             // Logging opțional

// ── API Routes ───────────────────────────────────────────────
app.use('/api/projects', projectsRouter(projectService));
app.use('/api/persons', personsRouter(personService));
app.use('/api/pontaj', pontajRouter(pontajService));
app.use('/api/dashboard', dashboardRouter(pontajService, projectService));
app.use('/api', backupRouter(projectService, personService, pontajService));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '2.1.0',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()) + 's'
    });
});

// ── Static files (frontend) ──────────────────────────────────
app.use(express.static(PUBLIC_DIR));

// ── Fallback → index.html (SPA) ──────────────────────────────
app.use((req, res) => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html negasit');
    }
});

// ── Error handler (trebuie sa fie ultimul middleware) ────────
app.use(errorHandler);

// ============================================================
//  START SERVER
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  ██████╗  ██████╗ ███╗   ██╗████████╗ █████╗      ██╗');
    console.log('  ██╔══██╗██╔═══██╗████╗  ██║╚══██╔══╝██╔══██╗     ██║');
    console.log('  ██████╔╝██║   ██║██╔██╗ ██║   ██║   ███████║     ██║');
    console.log('  ██╔═══╝ ██║   ██║██║╚██╗██║   ██║   ██╔══██║██   ██║');
    console.log('  ██║     ╚██████╔╝██║ ╚████║   ██║   ██║  ██║╚█████╔╝');
    console.log('  ╚═╝      ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚════╝ ');
    console.log('');
    console.log(`  Pontaj Manager v2.1 (Express) — Server pornit!`);
    console.log(`  Local:    http://localhost:${PORT}`);
    console.log(`  Retea:    http://<IP-ul-tau>:${PORT}`);
    console.log('');
    console.log('  Date salvate in: ./data/');
    console.log('  API disponibil la: /api/health');
    console.log('  Apasa Ctrl+C pentru a opri serverul.');
    console.log('');
});

module.exports = app; // pentru teste viitoare
