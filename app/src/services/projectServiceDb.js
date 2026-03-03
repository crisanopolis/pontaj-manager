// ============================================================
//  PONTAJ MANAGER — services/projectServiceDb.js
//  Service proiecte cu SQLite (node:sqlite)
//  Drop-in replacement pentru projectService.js (JSON)
// ============================================================

const { uid } = require('../utils/fileStore');

class ProjectServiceDb {
    /** @param {import('node:sqlite').DatabaseSync} db */
    constructor(db) {
        this.db = db;
    }

    /** Returneaza toate proiectele (cu membrii lor). */
    getAll() {
        const projects = this.db.prepare(`
            SELECT * FROM projects ORDER BY name
        `).all();

        // Atasam membrii fiecarui proiect
        const membersStmt = this.db.prepare(`
            SELECT * FROM project_members WHERE project_id = ?
        `);

        return projects.map(p => ({
            ...this._mapToApi(p),
            members: membersStmt.all(p.id).map(m => ({
                personId: m.person_id,
                partner: m.partner,
                type: m.type,
                defaultOre: m.default_ore,
                defaultNorma: m.default_norma
            }))
        }));
    }

    /** Returneaza un proiect dupa id (cu membrii), sau null. */
    getById(id) {
        const p = this.db.prepare(`SELECT * FROM projects WHERE id = ?`).get(id);
        if (!p) return null;

        const members = this.db.prepare(`
            SELECT * FROM project_members WHERE project_id = ?
        `).all(id).map(m => ({
            personId: m.person_id,
            partner: m.partner,
            type: m.type,
            defaultOre: m.default_ore,
            defaultNorma: m.default_norma
        }));

        return { ...this._mapToApi(p), members };
    }

    /**
     * Creare sau actualizare proiect (upsert) + membrii.
     * @param {object} data - datele proiectului in formatul API (camelCase)
     * @returns {object} - proiectul salvat
     */
    upsert(data) {
        data.id = data.id || uid();
        if (!data.members) data.members = [];

        // Upsert proiect
        this.db.prepare(`
            INSERT INTO projects (id, name, smis, contract, partner, inst_name, inst_addr, etapa, intocmit, verificat, color, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name, smis = excluded.smis, contract = excluded.contract,
                partner = excluded.partner, inst_name = excluded.inst_name,
                inst_addr = excluded.inst_addr, etapa = excluded.etapa,
                intocmit = excluded.intocmit, verificat = excluded.verificat,
                color = excluded.color, updated_at = datetime('now')
        `).run(
            data.id, data.name, data.smis || null, data.contract || null,
            data.partner || null, data.instName || null, data.instAddr || null,
            data.etapa || null, data.intocmit || null, data.verificat || null,
            data.color || '#3b6fff'
        );

        // Reconstruim membrii: stergem toti, reinseram
        this.db.prepare(`DELETE FROM project_members WHERE project_id = ?`).run(data.id);
        const insertMember = this.db.prepare(`
            INSERT OR IGNORE INTO project_members (id, project_id, person_id, partner, type, default_ore, default_norma)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const m of data.members) {
            insertMember.run(uid(), data.id, m.personId, m.partner || null,
                m.type || null, m.defaultOre ?? 8, m.defaultNorma ?? 0);
        }

        return this.getById(data.id);
    }

    /**
     * Sterge un proiect (CASCADE sterge si membrii si pontajul).
     * @param {string} id
     */
    delete(id) {
        const result = this.db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
        return result.changes > 0;
    }

    /** Mapeaza randurile din DB (snake_case) la API format (camelCase). */
    _mapToApi(p) {
        return {
            id: p.id,
            name: p.name,
            smis: p.smis,
            contract: p.contract,
            partner: p.partner,
            instName: p.inst_name,
            instAddr: p.inst_addr,
            etapa: p.etapa,
            intocmit: p.intocmit,
            verificat: p.verificat,
            color: p.color,
        };
    }
}

module.exports = ProjectServiceDb;
