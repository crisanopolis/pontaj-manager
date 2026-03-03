// ============================================================
//  PONTAJ MANAGER — routes/pontaj.js
//  Rute Express pentru pontaje (/api/pontaj)
// ============================================================

const express = require('express');
const router = express.Router();

module.exports = function (pontajService, projectService) {

    // GET /api/pontaj/:projId/:year/:month — pontajul unei luni
    router.get('/:projId/:year/:month', (req, res) => {
        const { projId, year, month } = req.params;
        const data = pontajService.get(projId, year, month);
        res.json(data);
    });

    // POST /api/pontaj/:projId/:year/:month — salveaza pontajul unei luni
    router.post('/:projId/:year/:month', (req, res) => {
        const { projId, year, month } = req.params;
        pontajService.save(projId, year, month, req.body);
        res.json({ ok: true });
    });

    // GET /api/pontaj/:projId/all — toate lunile cu date pt proiect
    router.get('/:projId/all', (req, res) => {
        const data = pontajService.getAllForProject(req.params.projId);
        res.json(data);
    });

    // POST /api/pontaj/reconcile/:projId — sincronizare retroactiva: adauga in membres persoanele cu date in pontaj
    router.post('/reconcile/:projId', (req, res) => {
        try {
            const { projId } = req.params;
            const proj = projectService.getById(projId);
            if (!proj) return res.status(404).json({ error: 'Proiect negasit' });

            // Collect all unique personIds from all pontaj files for this project
            const allPontajData = pontajService.getAllForProject(projId);
            const allPersonIds = new Set();
            Object.values(allPontajData).forEach(monthData => {
                Object.keys(monthData).forEach(pid => allPersonIds.add(pid));
            });

            // Find which ones are NOT in proj.members
            const existingMemberIds = new Set((proj.members || []).map(m => String(m.personId)));
            const toAdd = [...allPersonIds].filter(pid => !existingMemberIds.has(String(pid)));

            if (toAdd.length === 0) {
                return res.json({ ok: true, added: 0, message: 'Toti sunt deja membri' });
            }

            // Add them
            const newMembers = [
                ...(proj.members || []),
                ...toAdd.map(pid => ({
                    personId: pid,
                    type: 'Importat',
                    partner: proj.partner || ''
                }))
            ];
            const updatedProj = { ...proj, members: newMembers };
            projectService.upsert(updatedProj);

            res.json({ ok: true, added: toAdd.length, addedIds: toAdd });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    return router;
};
