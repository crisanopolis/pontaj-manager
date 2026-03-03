// ============================================================
//  PONTAJ MANAGER — routes/projects.js
//  Rute Express pentru proiecte (/api/projects)
// ============================================================

const express = require('express');
const router = express.Router();

module.exports = function (projectService) {

    // GET /api/projects — lista tuturor proiectelor
    router.get('/', (req, res) => {
        res.json(projectService.getAll());
    });

    // GET /api/projects/:id — un singur proiect
    router.get('/:id', (req, res) => {
        const proj = projectService.getById(req.params.id);
        if (!proj) return res.status(404).json({ error: 'Proiect negasit' });
        res.json(proj);
    });

    // POST /api/projects — creare sau actualizare (upsert)
    router.post('/', (req, res) => {
        const data = req.body;
        const saved = projectService.upsert(data);
        res.json(saved);
    });

    // PUT /api/projects/:id — actualizare explicita dupa id
    router.put('/:id', (req, res) => {
        const data = { ...req.body, id: req.params.id };
        const saved = projectService.upsert(data);
        res.json(saved);
    });

    // DELETE /api/projects/:id — stergere proiect
    router.delete('/:id', (req, res) => {
        const deleted = projectService.delete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Proiect negasit' });
        res.json({ ok: true });
    });

    return router;
};
