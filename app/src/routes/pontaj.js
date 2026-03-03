// ============================================================
//  PONTAJ MANAGER — routes/pontaj.js
//  Rute Express pentru pontaje (/api/pontaj)
// ============================================================

const express = require('express');
const router = express.Router();

module.exports = function (pontajService) {

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

    return router;
};
