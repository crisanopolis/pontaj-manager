// ============================================================
//  PONTAJ MANAGER — routes/persons.js
//  Rute Express pentru persoane (/api/persons)
// ============================================================

const express = require('express');
const router = express.Router();

module.exports = function (personService) {

    // GET /api/persons — lista tuturor persoanelor
    router.get('/', (req, res) => {
        res.json(personService.getAll());
    });

    // GET /api/persons/:id — o singura persoana
    router.get('/:id', (req, res) => {
        const p = personService.getById(req.params.id);
        if (!p) return res.status(404).json({ error: 'Persoana negasita' });
        res.json(p);
    });

    // POST /api/persons — creare sau actualizare (upsert)
    router.post('/', (req, res) => {
        const saved = personService.upsert(req.body);
        res.json(saved);
    });

    // POST /api/persons/bulk — import in masa din Excel/Parser
    router.post('/bulk', (req, res) => {
        const list = req.body;
        if (!Array.isArray(list)) {
            return res.status(400).json({ error: 'Body trebuie sa fie un array de persoane' });
        }
        const stats = personService.bulkUpsert(list);
        res.json({ ok: true, ...stats });
    });

    // PUT /api/persons/:id — actualizare explicita dupa id
    router.put('/:id', (req, res) => {
        const data = { ...req.body, id: req.params.id };
        const saved = personService.upsert(data);
        res.json(saved);
    });

    // DELETE /api/persons/:id — stergere persoana
    router.delete('/:id', (req, res) => {
        const deleted = personService.delete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Persoana negasita' });
        res.json({ ok: true });
    });

    return router;
};
