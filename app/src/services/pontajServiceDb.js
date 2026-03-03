// ============================================================
//  PONTAJ MANAGER — services/pontajServiceDb.js
//  Service pontaj cu SQLite — compatibil cu API-ul existent
// ============================================================

class PontajServiceDb {
    /** @param {import('node:sqlite').DatabaseSync} db */
    constructor(db) {
        this.db = db;
    }

    /**
     * Returneaza datele de pontaj pentru un proiect/luna in formatul
     * identic cu JSON-urile vechi:
     * { personId: { days: { "1": 8, ... }, norma: { "1": 0, ... } } }
     */
    get(projId, year, month) {
        const rows = this.db.prepare(`
            SELECT person_id, day, ore, norma, tip
            FROM pontaj_days
            WHERE project_id = ? AND year = ? AND month = ?
            ORDER BY person_id, day
        `).all(projId, parseInt(year), parseInt(month));

        const result = {};
        for (const row of rows) {
            if (!result[row.person_id]) {
                result[row.person_id] = { days: {}, norma: {} };
            }
            // Reconstruim valoarea: CO/CM ca string, altfel numarul de ore
            const dayVal = (row.tip === 'CO' || row.tip === 'CM') ? row.tip : (row.ore || 0);
            result[row.person_id].days[String(row.day)] = dayVal;
            result[row.person_id].norma[String(row.day)] = row.norma || 0;
        }
        return result;
    }

    /**
     * Salveaza pontajul pentru un proiect/luna.
     * Primeste acelasi format ca JSON-urile vechi.
     * Foloseste tranzactie pentru atomicitate.
     */
    save(projId, year, month, data) {
        const yr = parseInt(year);
        const mo = parseInt(month);

        // Stergem toate zilele existente pentru aceasta luna
        // si reinseram — abordare simpla si sigura
        try {
            this.db.exec('BEGIN TRANSACTION');

            this.db.prepare(`
                DELETE FROM pontaj_days
                WHERE project_id = ? AND year = ? AND month = ?
            `).run(projId, yr, mo);

            const insert = this.db.prepare(`
                INSERT INTO pontaj_days (project_id, person_id, year, month, day, ore, norma, tip)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const [personId, pData] of Object.entries(data)) {
                const daysMap = pData.days || {};
                const normaMap = pData.norma || {};

                for (const [dayStr, dayVal] of Object.entries(daysMap)) {
                    const dayNum = parseInt(dayStr);
                    let ore = 0;
                    let tip = 'Activitate';

                    if (typeof dayVal === 'string' && (dayVal.toUpperCase() === 'CO' || dayVal.toUpperCase() === 'CM')) {
                        tip = dayVal.toUpperCase();
                    } else {
                        // Trateaza atat numere cat si string-uri numerice din formulare/parser
                        const parsedOre = parseFloat(dayVal);
                        if (!isNaN(parsedOre)) ore = parsedOre;
                    }

                    const parsedNorma = parseFloat(normaMap[dayStr]);
                    const normaVal = isNaN(parsedNorma) ? 0 : parsedNorma;

                    insert.run(projId, personId, yr, mo, dayNum, ore, normaVal, tip);
                }
            }

            this.db.exec('COMMIT');
        } catch (err) {
            this.db.exec('ROLLBACK');
            throw err;
        }
    }

    /**
     * Returneaza toate lunile cu date pentru un proiect,
     * in acelasi format ca JSON: { "projId_year_month": {...} }
     */
    getAllForProject(projId) {
        const months = this.db.prepare(`
            SELECT DISTINCT year, month FROM pontaj_days
            WHERE project_id = ?
            ORDER BY year, month
        `).all(projId);

        const result = {};
        for (const { year, month } of months) {
            result[`${projId}_${year}_${month}`] = this.get(projId, year, month);
        }
        return result;
    }

    /**
     * Statistici agregate pentru dashboard global.
     * Tine cont DOAR de membrii activi ai proiectelor active.
     */
    getDashboardStats(year, month, activeProjects) {
        const yr = parseInt(year);
        const mo = parseInt(month);

        // Colectam project_id si person_id valide
        const validPairs = [];
        for (const proj of activeProjects) {
            for (const m of (proj.members || [])) {
                validPairs.push({ projId: proj.id, personId: m.personId });
            }
        }

        if (!validPairs.length) {
            return { totalOre: 0, totalCO_CM: 0, totalPers: 0 };
        }

        // Construim conditia WHERE dinamica
        const placeholders = validPairs.map(() => '(project_id = ? AND person_id = ?)').join(' OR ');
        const params = validPairs.flatMap(p => [p.projId, p.personId]);

        const rows = this.db.prepare(`
            SELECT person_id, ore, tip
            FROM pontaj_days
            WHERE year = ? AND month = ? AND (${placeholders})
        `).all(yr, mo, ...params);

        let totalOre = 0;
        let totalCO_CM = 0;
        const uniquePersons = new Set();

        for (const row of rows) {
            if (row.tip === 'CO' || row.tip === 'CM') {
                totalCO_CM++;
                uniquePersons.add(row.person_id);
            } else if (row.ore > 0) {
                totalOre += row.ore;
                uniquePersons.add(row.person_id);
            }
        }

        return { totalOre, totalCO_CM, totalPers: uniquePersons.size };
    }

    /**
     * Export complet pentru backup — identic cu serviciul JSON.
     */
    exportAll() {
        const pairs = this.db.prepare(`
            SELECT DISTINCT project_id, year, month FROM pontaj_days ORDER BY project_id, year, month
        `).all();

        const result = {};
        for (const { project_id, year, month } of pairs) {
            const key = `pm_pontaj_${project_id}_${year}_${month}`;
            result[key] = this.get(project_id, year, month);
        }
        return result;
    }

    /**
     * Import din backup JSON.
     */
    importAll(pontajBulk) {
        for (const [key, data] of Object.entries(pontajBulk)) {
            // key = "pm_pontaj_{projId}_{year}_{month}"
            const clean = key.replace('pm_pontaj_', '').replace('pm_j_', '');
            const parts = clean.split('_');
            if (parts.length < 3) continue;
            const month = parts[parts.length - 1];
            const year = parts[parts.length - 2];
            const projId = parts.slice(0, parts.length - 2).join('_');
            this.save(projId, year, month, data);
        }
    }
}

module.exports = PontajServiceDb;
