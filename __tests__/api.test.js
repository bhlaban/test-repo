const request = require('supertest');
const { createApp } = require('../server');
const { createDatabase } = require('../db');

// Use a fresh in-memory database for each test suite
let app;
let db;

beforeAll(() => {
  db = createDatabase(':memory:');
  app = createApp(db);
});

describe('Trips API', () => {
  let tripId;

  test('GET /api/trips returns empty array initially', async () => {
    const res = await request(app).get('/api/trips');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test('POST /api/trips creates a trip', async () => {
    const res = await request(app)
      .post('/api/trips')
      .send({ start_time: '2024-05-01T08:00', location: 'Clear Creek', notes: 'Test trip' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.location).toBe('Clear Creek');
    expect(res.body.end_time).toBeNull();
    tripId = res.body.id;
  });

  test('POST /api/trips returns 400 when start_time missing', async () => {
    const res = await request(app).post('/api/trips').send({ location: 'No time' });
    expect(res.status).toBe(400);
  });

  test('GET /api/trips returns the created trip', async () => {
    const res = await request(app).get('/api/trips');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(tripId);
  });

  test('GET /api/trips/:id returns trip with catches array', async () => {
    const res = await request(app).get(`/api/trips/${tripId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(tripId);
    expect(Array.isArray(res.body.catches)).toBe(true);
  });

  test('GET /api/trips/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/trips/9999');
    expect(res.status).toBe(404);
  });

  test('PUT /api/trips/:id updates trip end_time', async () => {
    const res = await request(app)
      .put(`/api/trips/${tripId}`)
      .send({ end_time: '2024-05-01T12:00' });
    expect(res.status).toBe(200);
    expect(res.body.end_time).toBe('2024-05-01T12:00');
  });

  test('DELETE /api/trips/:id deletes the trip', async () => {
    const del = await request(app).delete(`/api/trips/${tripId}`);
    expect(del.status).toBe(204);
    const get = await request(app).get(`/api/trips/${tripId}`);
    expect(get.status).toBe(404);
  });
});

describe('Catches API', () => {
  let tripId;
  let catchId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/trips')
      .send({ start_time: '2024-06-15T06:00', location: 'Green River' });
    tripId = res.body.id;
  });

  test('POST /api/trips/:tripId/catches creates a catch', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/catches`)
      .send({
        catch_time: '2024-06-15T07:30',
        species: 'Rainbow Trout',
        length_inches: 14.5,
        weight_lbs: 1.2,
        water_temp_f: 55,
        water_clarity: 'Clear',
        water_level: 'Normal',
        weather_condition: 'Sunny',
        air_temp_f: 68,
        wind_speed_mph: 5,
        wind_direction: 'SW',
        lure_bait: 'Rapala',
        kept: false,
        notes: 'Beautiful fish'
      });
    expect(res.status).toBe(201);
    expect(res.body.species).toBe('Rainbow Trout');
    expect(res.body.water_clarity).toBe('Clear');
    expect(res.body.weather_condition).toBe('Sunny');
    expect(res.body.kept).toBe(0);
    catchId = res.body.id;
  });

  test('POST /api/trips/:tripId/catches returns 400 when catch_time missing', async () => {
    const res = await request(app)
      .post(`/api/trips/${tripId}/catches`)
      .send({ species: 'Brown Trout' });
    expect(res.status).toBe(400);
  });

  test('POST /api/trips/:tripId/catches returns 404 for unknown trip', async () => {
    const res = await request(app)
      .post('/api/trips/9999/catches')
      .send({ catch_time: '2024-06-15T08:00' });
    expect(res.status).toBe(404);
  });

  test('GET /api/trips/:tripId/catches returns catches', async () => {
    const res = await request(app).get(`/api/trips/${tripId}/catches`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(catchId);
  });

  test('PUT /api/trips/:tripId/catches/:id updates catch', async () => {
    const res = await request(app)
      .put(`/api/trips/${tripId}/catches/${catchId}`)
      .send({ kept: true, weight_lbs: 1.5 });
    expect(res.status).toBe(200);
    expect(res.body.kept).toBe(1);
    expect(res.body.weight_lbs).toBe(1.5);
  });

  test('DELETE /api/trips/:tripId/catches/:id deletes catch', async () => {
    const del = await request(app).delete(`/api/trips/${tripId}/catches/${catchId}`);
    expect(del.status).toBe(204);
    const list = await request(app).get(`/api/trips/${tripId}/catches`);
    expect(list.body.length).toBe(0);
  });

  test('Trip detail includes catches', async () => {
    // Add another catch
    await request(app)
      .post(`/api/trips/${tripId}/catches`)
      .send({ catch_time: '2024-06-15T09:00', species: 'Brook Trout' });

    const res = await request(app).get(`/api/trips/${tripId}`);
    expect(res.status).toBe(200);
    expect(res.body.catches.length).toBe(1);
    expect(res.body.catches[0].species).toBe('Brook Trout');
  });
});
