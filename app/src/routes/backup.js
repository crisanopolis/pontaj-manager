// ============================================================
//  PONTAJ MANAGER — routes/backup.js
//  Rute Express pentru export/import backup (/api/export, /api/import)
// ============================================================

const express = require('express');
const router = express.Router();

module.exports = function (projectService, personService, pontajService) {

    // GET /api/export — backup complet JSON
    router.get('/export', (req, res) => {
        const projects = projectService.getAll();
        const persons = personService.getAll();
        const pontaj = pontajService.exportAll();
        const exportData = {
            projects,
            persons,
            pontaj,
            exportedAt: new Date().toISOString()
        };
        const filename = `pontaj_backup_${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(exportData);
    });

    // POST /api/import — restore din backup JSON
    router.post('/import', (req, res) => {
        const data = req.body;
        if (!data || typeof data !== 'object') {
            return res.status(400).json({ error: 'Format invalid' });
        }
        if (data.projects) data.projects.forEach(p => projectService.upsert(p));
        if (data.persons) data.persons.forEach(p => personService.upsert(p));
        if (data.pontaj) pontajService.importAll(data.pontaj);
        res.json({ ok: true, message: 'Import realizat cu succes!' });
    });

    return router;
};
