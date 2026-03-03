// ============================================================
//  PONTAJ MANAGER — db/migrate.js
//  Script migrare date din fisiere JSON -> baza de date SQLite
//
//  Rulare:
//    node app/src/db/migrate.js
//
//  Ce face:
//    1. Citeste projects.json, persons.json si toate fisierele pontaj/
//    2. Insereaza datele in SQLite (pontaj.db)
//    3. Datele JSON originale raman nemodificate (rollback posibil)
// ============================================================

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { applySchema } = require('./schema');
const { uid } = require('../utils/fileStore');

// ── Paths ────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'pontaj.db');

// ── Helpers ──────────────────────────────────────────────────
function readJSON(filePath) {
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
    catch { return null; }
}

function log(msg) {
    console.log(`[MIGRATE] ${msg}`);
}

// ============================================================
//  MAIN
// ============================================================
async function migrate() {
    if (!fs.existsSync(DATA_DIR)) {
        console.error('ERROR: Directorul data/ nu exista! Asigura-te ca aplicatia a rulat cel putin o data.');
        process.exit(1);
    }

    // Daca baza de date exista deja, facem backup
    if (fs.existsSync(DB_PATH)) {
        const backupPath = DB_PATH + `.backup_${Date.now()}`;
        fs.copyFileSync(DB_PATH, backupPath);
        log(`Backup baza de date existenta: ${backupPath}`);
    }

    const db = new DatabaseSync(DB_PATH);
    applySchema(db);
    // Dezactivam FK temporar in migrare (datele pot veni in orice ordine)
    db.exec(`PRAGMA foreign_keys = OFF;`);
    log('Schema aplicata.');

    // ── Migrare PROJECTS ────────────────────────────────────
    const projects = readJSON(path.join(DATA_DIR, 'projects.json')) || [];
    log(`Migrare ${projects.length} proiecte...`);

    const insertProject = db.prepare(`
        INSERT OR REPLACE INTO projects (id, name, smis, contract, partner, inst_name, inst_addr, etapa, intocmit, verificat, color)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMember = db.prepare(`
        INSERT OR IGNORE INTO project_members (id, project_id, person_id, partner, type, default_ore, default_norma)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let projCount = 0, memberCount = 0;
    for (const p of projects) {
        insertProject.run(
            p.id, p.name, p.smis || null, p.contract || null,
            p.partner || null, p.instName || null, p.instAddr || null,
            p.etapa || null, p.intocmit || null, p.verificat || null,
            p.color || '#3b6fff'
        );
        projCount++;

        // Membrii proiectului
        for (const m of (p.members || [])) {
            insertMember.run(
                uid(), p.id, m.personId,
                m.partner || null, m.type || null,
                m.defaultOre ?? 8, m.defaultNorma ?? 0
            );
            memberCount++;
        }
    }
    log(`  ✓ ${projCount} proiecte, ${memberCount} relatii membri`);

    // ── Migrare PERSONS ─────────────────────────────────────
    const persons = readJSON(path.join(DATA_DIR, 'persons.json')) || [];
    log(`Migrare ${persons.length} persoane...`);

    const insertPerson = db.prepare(`
        INSERT OR REPLACE INTO persons (id, name, cnp, cim, cor, employer, role, norma)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let personCount = 0;
    for (const p of persons) {
        insertPerson.run(
            p.id,
            p.name || p.Name || 'Necunoscut',
            p.cnp || p.CNP || null,
            p.cim || p.CIM || null,
            p.cor || p.COR || null,
            p.angajator || p.employer || p.partner || null,
            p.type || p.role || null,
            p.norma ?? 8
        );
        personCount++;
    }
    log(`  ✓ ${personCount} persoane`);

    // ── Migrare PONTAJ ──────────────────────────────────────
    const pontajDir = path.join(DATA_DIR, 'pontaj');
    if (!fs.existsSync(pontajDir)) {
        log('  ! Directorul pontaj/ nu exista, sarind...');
    } else {
        const files = fs.readdirSync(pontajDir).filter(f => f.endsWith('.json'));
        log(`Migrare ${files.length} fisiere pontaj...`);

        const insertDay = db.prepare(`
            INSERT OR REPLACE INTO pontaj_days (project_id, person_id, year, month, day, ore, norma, tip)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let dayCount = 0;
        for (const f of files) {
            // Numele fisierului: {projId}_{year}_{month}.json
            const parts = f.replace('.json', '').split('_');
            if (parts.length < 3) continue;

            const month = parseInt(parts[parts.length - 1]);
            const year = parseInt(parts[parts.length - 2]);
            const projId = parts.slice(0, parts.length - 2).join('_');

            const data = readJSON(path.join(pontajDir, f));
            if (!data) continue;

            // data = { personId: { days: { "1": 8, ... }, norma: { "1": 0, ... } } }
            for (const [personId, pData] of Object.entries(data)) {
                const daysMap = pData.days || {};
                const normaMap = pData.norma || {};

                for (const [dayStr, dayVal] of Object.entries(daysMap)) {
                    const dayNum = parseInt(dayStr);
                    let ore = 0, tip = 'Activitate';

                    if (typeof dayVal === 'number') {
                        ore = dayVal;
                    } else if (typeof dayVal === 'string') {
                        tip = dayVal; // 'CO' sau 'CM'
                        ore = 0;
                    }

                    const normaVal = typeof normaMap[dayStr] === 'number'
                        ? normaMap[dayStr] : 0;

                    insertDay.run(projId, personId, year, month, dayNum, ore, normaVal, tip);
                    dayCount++;
                }
            }
        }
        log(`  ✓ ${dayCount} inregistrari pontaj (zile)`);
    }

    // ── Log audit ───────────────────────────────────────────
    db.prepare(`
        INSERT INTO activity_logs (action, entity_type, details)
        VALUES ('MIGRATE_JSON_TO_SQLITE', 'system', ?)
    `).run(JSON.stringify({
        projectsMigrated: projCount,
        personsMigrated: personCount,
        timestamp: new Date().toISOString()
    }));

    db.close();

    log('');
    log('✅ Migrare completata cu succes!');
    log(`   Baza de date: ${DB_PATH}`);
    log('   Fisierele JSON originale au ramas nemodificate.');
    log('');
}

migrate().catch(err => {
    console.error('EROARE la migrare:', err);
    process.exit(1);
});
