// ============================================================
//  PONTAJ MANAGER — db/schema.js
//  Schema SQL pentru SQLite (node:sqlite built-in Node.js 22+)
//  Tabele: projects, persons, project_members, pontaj_days, activity_logs
// ============================================================

/**
 * Aplica schema completa pe o instanta DatabaseSync.
 * Este idempotent (CREATE TABLE IF NOT EXISTS) — sigur la restart.
 * @param {import('node:sqlite').DatabaseSync} db
 */
function applySchema(db) {
    // ── PRAGMA-uri pentru performanta si integritate ──────────
    db.exec(`PRAGMA journal_mode = WAL;`);   // scrieri concurente mai rapide
    db.exec(`PRAGMA foreign_keys = ON;`);    // FK constraints active

    // ── Proiecte ─────────────────────────────────────────────
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            smis        TEXT,
            contract    TEXT,
            partner     TEXT,
            inst_name   TEXT,
            inst_addr   TEXT,
            etapa       TEXT,
            intocmit    TEXT,
            verificat   TEXT,
            color       TEXT DEFAULT '#3b6fff',
            created_at  TEXT DEFAULT (datetime('now')),
            updated_at  TEXT DEFAULT (datetime('now'))
        );
    `);

    // ── Persoane ─────────────────────────────────────────────
    db.exec(`
        CREATE TABLE IF NOT EXISTS persons (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            cnp         TEXT UNIQUE,
            cim         TEXT,
            cor         TEXT,
            employer    TEXT,
            role        TEXT,   -- 'Management' | 'Cercetare' | 'BST' | 'EMI'
            norma       REAL DEFAULT 8,
            created_at  TEXT DEFAULT (datetime('now')),
            updated_at  TEXT DEFAULT (datetime('now'))
        );
    `);

    // ── Membrii unui proiect (relatie M:M Proiect <-> Persoana) ─
    db.exec(`
        CREATE TABLE IF NOT EXISTS project_members (
            id              TEXT PRIMARY KEY,
            project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            person_id       TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
            partner         TEXT,
            type            TEXT,   -- 'Management' | 'Cercetare'
            default_ore     REAL DEFAULT 8,
            default_norma   REAL DEFAULT 0,
            added_at        TEXT DEFAULT (datetime('now')),
            UNIQUE(project_id, person_id)
        );
    `);

    // ── Pontaj pe zile ───────────────────────────────────────
    // O inregistrare per persoana/proiect/zi/tip
    db.exec(`
        CREATE TABLE IF NOT EXISTS pontaj_days (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            person_id   TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
            year        INTEGER NOT NULL,
            month       INTEGER NOT NULL,
            day         INTEGER NOT NULL,
            ore         REAL DEFAULT 0,     -- ore lucrate pe proiect
            norma       REAL DEFAULT 0,     -- ore norma la locul de baza
            tip         TEXT DEFAULT 'Activitate',  -- 'Activitate' | 'CO' | 'CM'
            UNIQUE(project_id, person_id, year, month, day)
        );
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_pontaj_ym ON pontaj_days(year, month);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_pontaj_proj ON pontaj_days(project_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_pontaj_person ON pontaj_days(person_id);`);

    // ── Jurnal de activitate (audit log) ─────────────────────
    db.exec(`
        CREATE TABLE IF NOT EXISTS activity_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            action      TEXT NOT NULL,   -- 'CREATE_PROJECT' | 'SAVE_PONTAJ' | etc.
            entity_type TEXT,            -- 'project' | 'person' | 'pontaj'
            entity_id   TEXT,
            details     TEXT,            -- JSON cu date suplimentare
            created_at  TEXT DEFAULT (datetime('now'))
        );
    `);
}

module.exports = { applySchema };
