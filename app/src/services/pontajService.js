// ============================================================
//  PONTAJ MANAGER — services/pontajService.js
//  Logica business pentru pontaje
// ============================================================

const path = require('path');
const fs = require('fs');
const { readJSON, writeJSON } = require('../utils/fileStore');

class PontajService {
    constructor(dataDir) {
        this.pontajDir = path.join(dataDir, 'pontaj');
    }

    /** Calea fisierului de pontaj pentru un proiect/luna */
    _filePath(projId, year, month) {
        return path.join(this.pontajDir, `${projId}_${year}_${month}.json`);
    }

    /**
     * Returneaza datele de pontaj pentru un proiect si o luna.
     * @returns {object} - { personId: { days: {...}, norma: {...} }, ... }
     */
    get(projId, year, month) {
        return readJSON(this._filePath(projId, year, month)) || {};
    }

    /**
     * Salveaza datele de pontaj pentru un proiect si o luna.
     * @param {string} projId
     * @param {string|number} year
     * @param {string|number} month
     * @param {object} data
     */
    save(projId, year, month, data) {
        writeJSON(this._filePath(projId, year, month), data);
    }

    /**
     * Returneaza toate lunile cu date salvate pentru un proiect.
     * @param {string} projId
     * @returns {object} - { "projId_year_month": { ... }, ... }
     */
    getAllForProject(projId) {
        const files = fs.readdirSync(this.pontajDir)
            .filter(f => f.startsWith(`${projId}_`) && f.endsWith('.json'));
        const result = {};
        files.forEach(f => {
            const key = f.replace('.json', '');
            result[key] = readJSON(path.join(this.pontajDir, f)) || {};
        });
        return result;
    }

    /**
     * Calculeaza statistici agregate pentru luna/an specificata.
     * Tine cont DOAR de proiectele/persoanele active.
     * @param {string|number} year
     * @param {string|number} month
     * @param {object[]} activeProjects - lista proiectelor active
     * @returns {{ totalOre: number, totalCO_CM: number, totalPers: number }}
     */
    getDashboardStats(year, month, activeProjects) {
        let totalOre = 0;
        let totalCO_CM = 0;
        const uniquePersons = new Set();

        // Build set of active project IDs
        const activeProjIds = new Set(activeProjects.map(p => p.id));

        if (!fs.existsSync(this.pontajDir)) return { totalOre, totalCO_CM, totalPers: 0 };

        const files = fs.readdirSync(this.pontajDir)
            .filter(f => f.endsWith(`_${year}_${month}.json`));

        for (const f of files) {
            // File name: projId_year_month.json (projId may contain underscores if uuid)
            // We match by stripping the suffix
            const suffix = `_${year}_${month}.json`;
            const projId = f.slice(0, f.length - suffix.length);
            if (!activeProjIds.has(projId)) continue; // project deleted

            const data = readJSON(path.join(this.pontajDir, f)) || {};
            for (const [pId, pData] of Object.entries(data)) {
                // Count ALL persons with data, including imported ones (not just formal members)
                let hasHours = false;
                const daysMap = pData.days || {};
                for (const dayVal of Object.values(daysMap)) {
                    if (typeof dayVal === 'number' && dayVal > 0) {
                        totalOre += dayVal;
                        hasHours = true;
                    } else if (typeof dayVal === 'string' && (dayVal === 'CO' || dayVal === 'CM')) {
                        totalCO_CM++;
                        hasHours = true;
                    }
                }
                if (hasHours) uniquePersons.add(pId);
            }
        }

        return { totalOre, totalCO_CM, totalPers: uniquePersons.size };
    }

    /**
     * Returneaza statistici per proiect pentru luna data.
     * Incude atat membrii formali cat si persoanele importate.
     */
    getProjectStats(projId, year, month) {
        const data = this.get(projId, year, month);
        let totalOre = 0;
        let totalCO_CM = 0;
        const persWithHours = new Set();

        for (const [pId, pData] of Object.entries(data)) {
            const daysMap = pData.days || {};
            let hasHours = false;
            for (const dayVal of Object.values(daysMap)) {
                if (typeof dayVal === 'number' && dayVal > 0) {
                    totalOre += dayVal;
                    hasHours = true;
                } else if (typeof dayVal === 'string' && (dayVal === 'CO' || dayVal === 'CM')) {
                    totalCO_CM++;
                    hasHours = true;
                }
            }
            if (hasHours) persWithHours.add(pId);
        }

        return { totalOre, totalCO_CM, persWithHours: persWithHours.size, allPersonIds: Object.keys(data) };
    }

    /**
     * Returneaza toate fisierele de pontaj (pentru export complet).
     * @returns {object} - { "pm_pontaj_projId_year_month": data, ... }
     */
    exportAll() {
        const result = {};
        if (!fs.existsSync(this.pontajDir)) return result;
        fs.readdirSync(this.pontajDir).forEach(f => {
            result[`pm_pontaj_${f.replace('.json', '')}`] = readJSON(path.join(this.pontajDir, f));
        });
        return result;
    }

    /**
     * Importa multiple fisiere de pontaj dintr-un backup.
     * @param {object} pontajBulk - { "pm_pontaj_...": data, ... }
     */
    importAll(pontajBulk) {
        Object.entries(pontajBulk).forEach(([k, v]) => {
            const key = k.replace('pm_pontaj_', '').replace('pm_j_', '');
            writeJSON(path.join(this.pontajDir, `${key}.json`), v);
        });
    }
}

module.exports = PontajService;
