// ============================================================
//  PONTAJ MANAGER — services/personServiceDb.js
//  Service persoane cu SQLite
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
            .map(this._mapToApi);
    }

    /** Returneaza o persoana dupa id. */
    getById(id) {
        const p = this.db.prepare(`SELECT * FROM persons WHERE id = ?`).get(id);
        return p ? this._mapToApi(p) : null;
    }

    /** Returneaza o persoana dupa CNP (unica). */
    getByCnp(cnp) {
        const p = this.db.prepare(`SELECT * FROM persons WHERE cnp = ?`).get(cnp);
        return p ? this._mapToApi(p) : null;
    }

    /**
     * Cauta persoane dupa text (nume, CNP, CIM, COR) si filtre opționale.
     * @param {{ search?: string, role?: string, employer?: string }} opts
     */
    search({ search = '', role = null, employer = null } = {}) {
        const conditions = [];
        const params = [];

        if (search) {
            conditions.push(`(name LIKE ? OR cnp LIKE ? OR cim LIKE ? OR cor LIKE ?)`);
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        if (role) {
            conditions.push(`role = ?`);
            params.push(role);
        }
        if (employer) {
            conditions.push(`employer LIKE ?`);
            params.push(`%${employer}%`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        return this.db.prepare(`SELECT * FROM persons ${where} ORDER BY name`)
            .all(...params).map(this._mapToApi);
    }

    /**
     * Creare sau actualizare persoana (upsert).
     */
    upsert(data) {
        data.id = data.id || uid();
        this.db.prepare(`
            INSERT INTO persons (id, name, cnp, cim, cor, employer, role, norma, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name, cnp = excluded.cnp, cim = excluded.cim,
                cor = excluded.cor, employer = excluded.employer, role = excluded.role,
                norma = excluded.norma, updated_at = datetime('now')
        `).run(
            data.id,
            data.name || data.Name,
            data.cnp || data.CNP || null,
            data.cim || data.CIM || null,
            data.cor || data.COR || null,
            data.angajator || data.employer || data.partner || null,
            data.type || data.role || null,
            data.norma ?? 8
        );
        return this.getById(data.id);
    }

    /**
     * Import in masa — face upsert pe fiecare persoana.
     * Detecteaza duplicatul dupa CNP daca nu exista id.
     */
    bulkUpsert(list) {
        let added = 0, updated = 0;
        for (const item of list) {
            // Incearca sa gaseasca dupa CNP daca nu are id
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

    _mapToApi(p) {
        return {
            id: p.id,
            name: p.name,
            cnp: p.cnp,
            cim: p.cim,
            cor: p.cor,
            angajator: p.employer,
            type: p.role,
            norma: p.norma,
        };
    }
}

module.exports = PersonServiceDb;
