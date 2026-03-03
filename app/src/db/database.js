// ============================================================
//  PONTAJ MANAGER — db/database.js
//  Singleton pentru conexiunea SQLite (node:sqlite built-in)
// ============================================================

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const { applySchema } = require('./schema');

let _db = null;

/**
 * Returneaza instanta singleton a bazei de date.
 * La primul apel, deschide / creeaza fisierul .db si aplica schema.
 * @param {string} [dataDir] - directorul unde se creaza pontaj.db
 * @returns {import('node:sqlite').DatabaseSync}
 */
function getDb(dataDir) {
    if (_db) return _db;
    if (!dataDir) throw new Error('getDb() necesita dataDir la primul apel');

    const dbPath = path.join(dataDir, 'pontaj.db');
    _db = new DatabaseSync(dbPath);
    applySchema(_db);
    console.log(`  [DB] SQLite conectat: ${dbPath}`);
    return _db;
}

module.exports = { getDb };
