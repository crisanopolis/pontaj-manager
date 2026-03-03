const request = require('supertest');
const app = require('../src/server');

describe('API Endpoints', () => {
    test('GET /api/health should return ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });

    test('GET /api/projects should return an array', async () => {
        const res = await request(app).get('/api/projects');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/persons should return an array or object with rows', async () => {
        const res = await request(app).get('/api/persons');
        expect(res.statusCode).toEqual(200);
        const data = res.body;
        expect(Array.isArray(data) || (data && Array.isArray(data.rows))).toBe(true);
    });
});
