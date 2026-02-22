'use strict';

const request = require('supertest');
const app = require('../src/app');

beforeEach(() => {
  app.resetStore();
});

describe('GET /api/entries', () => {
  it('returns an empty array when there are no entries', async () => {
    const res = await request(app).get('/api/entries');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all logged entries', async () => {
    await request(app)
      .post('/api/entries')
      .send({ date: '2024-06-01', species: 'Rainbow', weight: 1.5, location: 'Green River', notes: 'Dry fly' });

    const res = await request(app).get('/api/entries');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].species).toBe('Rainbow');
  });
});

describe('GET /api/entries/:id', () => {
  it('returns a single entry by id', async () => {
    const post = await request(app)
      .post('/api/entries')
      .send({ date: '2024-06-01', species: 'Brown' });
    const id = post.body.id;

    const res = await request(app).get(`/api/entries/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.species).toBe('Brown');
  });

  it('returns 404 for a missing entry', async () => {
    const res = await request(app).get('/api/entries/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/entries', () => {
  it('creates a new entry with required fields', async () => {
    const res = await request(app)
      .post('/api/entries')
      .send({ date: '2024-05-20', species: 'Brook' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.species).toBe('Brook');
    expect(res.body.date).toBe('2024-05-20');
  });

  it('creates a new entry with all optional fields', async () => {
    const res = await request(app)
      .post('/api/entries')
      .send({ date: '2024-07-04', species: 'Rainbow', weight: 3.2, location: 'Snake River', notes: 'Spinner bait' });

    expect(res.status).toBe(201);
    expect(res.body.weight).toBe(3.2);
    expect(res.body.location).toBe('Snake River');
    expect(res.body.notes).toBe('Spinner bait');
  });

  it('returns 400 when date is missing', async () => {
    const res = await request(app)
      .post('/api/entries')
      .send({ species: 'Rainbow' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when species is missing', async () => {
    const res = await request(app)
      .post('/api/entries')
      .send({ date: '2024-06-01' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/entries/:id', () => {
  it('deletes an existing entry', async () => {
    const post = await request(app)
      .post('/api/entries')
      .send({ date: '2024-06-01', species: 'Brook' });
    const id = post.body.id;

    const del = await request(app).delete(`/api/entries/${id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get('/api/entries');
    expect(get.body).toHaveLength(0);
  });

  it('returns 404 when deleting a missing entry', async () => {
    const res = await request(app).delete('/api/entries/999');
    expect(res.status).toBe(404);
  });
});
