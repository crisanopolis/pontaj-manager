// ============================================================
//  PONTAJ MANAGER — services/personService.js
//  Logica business pentru persoane
// ============================================================

const path = require('path');
const { readJSON, writeJSON, uid } = require('../utils/fileStore');

class PersonService {
    constructor(dataDir) {
        this.filePath = path.join(dataDir, 'persons.json');
    }

    /** Returneaza toate persoanele. */
    getAll() {
        return readJSON(this.filePath) || [];
    }

    /** Returneaza o persoana dupa id, sau null. */
    getById(id) {
        return this.getAll().find(p => p.id === id) || null;
    }

    /**
     * Creaza sau actualizeaza o persoana (upsert).
     * @param {object} data
     * @returns {object} - persoana salvata
     */
    upsert(data) {
        const persons = this.getAll();
        data.id = data.id || uid();
        const idx = persons.findIndex(p => p.id === data.id);
        if (idx >= 0) persons[idx] = data;
        else persons.push(data);
        writeJSON(this.filePath, persons);
        return data;
    }

    /**
     * Import in masa a mai multor persoane. 
     * Face upsert pe fiecare in parte (keyed by CNP).
     * @param {object[]} list
     * @returns {{ added: number, updated: number }}
     */
    bulkUpsert(list) {
        const persons = this.getAll();
        let added = 0, updated = 0;
        for (const item of list) {
            item.id = item.id || uid();
            const idx = persons.findIndex(p => p.id === item.id || (item.cnp && p.cnp === item.cnp));
            if (idx >= 0) {
                persons[idx] = { ...persons[idx], ...item };
                updated++;
            } else {
                persons.push(item);
                added++;
            }
        }
        writeJSON(this.filePath, persons);
        return { added, updated };
    }

    /**
     * Sterge o persoana dupa id.
     * @param {string} id
     * @returns {boolean}
     */
    delete(id) {
        const persons = this.getAll();
        const filtered = persons.filter(p => p.id !== id);
        if (filtered.length === persons.length) return false;
        writeJSON(this.filePath, filtered);
        return true;
    }
}

module.exports = PersonService;
