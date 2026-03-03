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

        // Mapa projectId -> Set(personId activ)
        const activeProjMembers = {};
        activeProjects.forEach(p => {
            activeProjMembers[p.id] = new Set((p.members || []).map(m => m.personId));
        });

        if (!fs.existsSync(this.pontajDir)) return { totalOre, totalCO_CM, totalPers: 0 };

        const files = fs.readdirSync(this.pontajDir)
            .filter(f => f.endsWith(`_${year}_${month}.json`));

        for (const f of files) {
            const projId = f.split('_')[0];
            if (!activeProjMembers[projId]) continue; // proiect sters

            const data = readJSON(path.join(this.pontajDir, f)) || {};
            for (const [pId, pData] of Object.entries(data)) {
                if (!activeProjMembers[projId].has(pId)) continue; // persoana scoasa din proiect

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
