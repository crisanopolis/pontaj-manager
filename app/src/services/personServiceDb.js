// ============================================================
//  PONTAJ MANAGER — services/personServiceDb.js
//  Service persoane cu SQLite — compatibil 100% cu frontend
// ============================================================

const { uid } = require('../utils/fileStore');

class PersonServiceDb {
    /** @param {import('node:sqlite').DatabaseSync} db */
    constructor(db) {
        this.db = db;
    }

    /** Returneaza toate persoanele. */
    getAll() {
        return this.db.prepare(`SELECT * FROM persons ORDER BY name`).all()
            .map(p => this._mapToApi(p));
    }

    /** Returneaza o persoana dupa id. */
    getById(id) {
        const p = this.db.prepare(`SELECT * FROM persons WHERE id = ?`).get(id);
        return p ? this._mapToApi(p) : null;
    }

    /** Returneaza o persoana dupa CNP. */
    getByCnp(cnp) {
        const p = this.db.prepare(`SELECT * FROM persons WHERE cnp = ?`).get(cnp);
        return p ? this._mapToApi(p) : null;
    }

    /**
     * Creare sau actualizare persoana (upsert).
     * Accepta exact formatul pe care il trimite frontend-ul.
     */
    upsert(data) {
        data.id = data.id || uid();

        // Normalizeaza campurile — frontend foloseste name + fname
        const name = data.name || data.Name || 'Necunoscut';
        const fname = data.fname || data.fName || '';
        const cnp = data.cnp || data.CNP || null;
        const cim = data.cim || data.CIM || null;
        const cor = data.cor || data.COR || null;
        const employer = data.partner || data.angajator || data.employer || null;
        const role = data.type || data.role || null;
        const norma = data.norma ?? 8;
        const defaultOre = data.defaultOre ?? 8;
        const defaultNorma = data.defaultNorma ?? 0;
        const employersJson = JSON.stringify(data.employers || []);

        this.db.prepare(`
            INSERT INTO persons (id, name, fname, cnp, cim, cor, employer, role, norma, default_ore, default_norma, employers_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name, fname = excluded.fname,
                cnp = excluded.cnp, cim = excluded.cim, cor = excluded.cor,
                employer = excluded.employer, role = excluded.role,
                norma = excluded.norma, default_ore = excluded.default_ore,
                default_norma = excluded.default_norma,
                employers_json = excluded.employers_json,
                updated_at = datetime('now')
        `).run(data.id, name, fname, cnp, cim, cor, employer, role,
            norma, defaultOre, defaultNorma, employersJson);

        return this.getById(data.id);
    }

    /**
     * Import in masa.
     */
    bulkUpsert(list) {
        let added = 0, updated = 0;
        for (const item of list) {
            if (!item.id && (item.cnp || item.CNP)) {
                const existing = this.getByCnp(item.cnp || item.CNP);
                if (existing) { item.id = existing.id; updated++; }
                else added++;
            } else {
                const existing = item.id ? this.getById(item.id) : null;
                if (existing) updated++; else added++;
            }
            this.upsert(item);
        }
        return { added, updated };
    }

    /** Sterge o persoana. */
    delete(id) {
        const result = this.db.prepare(`DELETE FROM persons WHERE id = ?`).run(id);
        return result.changes > 0;
    }

    /**
     * Mapeaza randul din DB la formatul exact pe care il asteapta frontend-ul.
     * Frontend foloseste: id, name, fname, cnp, cim, cor, angajator, type, norma, employers, partner, defaultOre, defaultNorma
     */
    _mapToApi(p) {
        let employers = [];
        try { employers = JSON.parse(p.employers_json || '[]'); } catch { }
        return {
            id: p.id,
            name: p.name,           // Nume de familie
            fname: p.fname || '',    // Prenume
            cnp: p.cnp,
            cim: p.cim,
            cor: p.cor,
            angajator: p.employer,       // compat frontend
            partner: p.employer,       // compat frontend
            type: p.role,
            norma: p.norma,
            defaultOre: p.default_ore,
            defaultNorma: p.default_norma,
            employers: employers,
        };
    }
}

module.exports = PersonServiceDb;
