// ============================================================
//  PONTAJ MANAGER — routes/dashboard.js
//  Rute Express pentru statistici globale (/api/dashboard)
// ============================================================

const express = require('express');
const router = express.Router();

module.exports = function (pontajService, projectService) {

    // GET /api/dashboard/:year/:month — statistici agregate luna
    router.get('/:year/:month', (req, res) => {
        const { year, month } = req.params;
        const activeProjects = projectService.getAll();
        const stats = pontajService.getDashboardStats(year, month, activeProjects);
        res.json(stats);
    });

    return router;
};
