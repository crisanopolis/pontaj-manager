// ============================================================
//  PONTAJ MANAGER — services/projectService.js
//  Logica business pentru proiecte
// ============================================================

const path = require('path');
const { readJSON, writeJSON, uid } = require('../utils/fileStore');

class ProjectService {
    constructor(dataDir) {
        this.filePath = path.join(dataDir, 'projects.json');
    }

    /** Returneaza toate proiectele. */
    getAll() {
        return readJSON(this.filePath) || [];
    }

    /** Returneaza un proiect dupa id, sau null. */
    getById(id) {
        return this.getAll().find(p => p.id === id) || null;
    }

    /**
     * Creaza sau actualizeaza un proiect (upsert).
     * @param {object} data - datele proiectului (cu sau fara id)
     * @returns {object}    - proiectul salvat
     */
    upsert(data) {
        const projects = this.getAll();
        data.id = data.id || uid();
        if (!data.members) data.members = [];
        const idx = projects.findIndex(p => p.id === data.id);
        if (idx >= 0) projects[idx] = data;
        else projects.push(data);
        writeJSON(this.filePath, projects);
        return data;
    }

    /**
     * Sterge un proiect dupa id.
     * @param {string} id
     * @returns {boolean} - true daca a fost gasit si sters
     */
    delete(id) {
        const projects = this.getAll();
        const filtered = projects.filter(p => p.id !== id);
        if (filtered.length === projects.length) return false;
        writeJSON(this.filePath, filtered);
        return true;
    }
}

module.exports = ProjectService;
