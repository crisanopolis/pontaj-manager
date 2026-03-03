// ============================================================
//  PONTAJ MANAGER — utils/fileStore.js
//  Helpers pentru citire/scriere atomică de fișiere JSON
// ============================================================

const fs = require('fs');
const path = require('path');

/**
 * Citeste un fișier JSON de pe disc.
 * @param {string} filePath  - calea absoluta
 * @returns {any | null}     - obiectul parsed sau null la eroare
 */
function readJSON(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * Scrie atomic un obiect ca JSON pe disc.
 * Scrie mai intai intr-un .tmp, apoi face rename → nu corupe fisierul la crash.
 * @param {string} filePath - calea absoluta
 * @param {any} data        - obiectul de scris
 */
function writeJSON(filePath, data) {
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, filePath);
}

/**
 * Generează un ID unic scurt (timestamp base36 + random).
 * @returns {string}
 */
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Asigura existenta directoarelor si fisierelor initiale.
 * @param {string} dataDir - directorul base de date
 */
function ensureDirs(dataDir) {
    [dataDir, path.join(dataDir, 'pontaj')].forEach(d => {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });
    const defaults = { 'projects.json': [], 'persons.json': [] };
    Object.entries(defaults).forEach(([f, def]) => {
        const fp = path.join(dataDir, f);
        if (!fs.existsSync(fp)) fs.writeFileSync(fp, JSON.stringify(def, null, 2));
    });
}

module.exports = { readJSON, writeJSON, uid, ensureDirs };
