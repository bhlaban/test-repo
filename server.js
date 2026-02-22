const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { createDatabase, DB_PATH } = require('./db');

function createApp(db) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', apiLimiter);

// ── Trips ──────────────────────────────────────────────────────────────────

// GET all trips
app.get('/api/trips', (req, res) => {
  const trips = db.prepare('SELECT * FROM trips ORDER BY start_time DESC').all();
  res.json(trips);
});

// GET a single trip with its catches
app.get('/api/trips/:id', (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  trip.catches = db.prepare('SELECT * FROM catches WHERE trip_id = ? ORDER BY catch_time').all(trip.id);
  res.json(trip);
});

// POST create a new trip
app.post('/api/trips', (req, res) => {
  const { start_time, end_time, location, notes } = req.body;
  if (!start_time) return res.status(400).json({ error: 'start_time is required' });
  const result = db.prepare(
    'INSERT INTO trips (start_time, end_time, location, notes) VALUES (?, ?, ?, ?)'
  ).run(start_time, end_time || null, location || null, notes || null);
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(trip);
});

// PUT update a trip (e.g. set end_time)
app.put('/api/trips/:id', (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const { start_time, end_time, location, notes } = req.body;
  db.prepare(
    'UPDATE trips SET start_time = ?, end_time = ?, location = ?, notes = ? WHERE id = ?'
  ).run(
    start_time ?? trip.start_time,
    end_time !== undefined ? end_time : trip.end_time,
    location !== undefined ? location : trip.location,
    notes !== undefined ? notes : trip.notes,
    trip.id
  );
  res.json(db.prepare('SELECT * FROM trips WHERE id = ?').get(trip.id));
});

// DELETE a trip
app.delete('/api/trips/:id', (req, res) => {
  const result = db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Trip not found' });
  res.status(204).send();
});

// ── Catches ────────────────────────────────────────────────────────────────

// GET all catches for a trip
app.get('/api/trips/:tripId/catches', (req, res) => {
  const trip = db.prepare('SELECT id FROM trips WHERE id = ?').get(req.params.tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const catches = db.prepare(
    'SELECT * FROM catches WHERE trip_id = ? ORDER BY catch_time'
  ).all(req.params.tripId);
  res.json(catches);
});

// POST add a catch to a trip
app.post('/api/trips/:tripId/catches', (req, res) => {
  const trip = db.prepare('SELECT id FROM trips WHERE id = ?').get(req.params.tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const {
    catch_time, species, length_inches, weight_lbs,
    water_temp_f, water_clarity, water_level,
    weather_condition, air_temp_f, wind_speed_mph, wind_direction,
    lure_bait, kept, notes
  } = req.body;

  if (!catch_time) return res.status(400).json({ error: 'catch_time is required' });

  const result = db.prepare(`
    INSERT INTO catches (
      trip_id, catch_time, species, length_inches, weight_lbs,
      water_temp_f, water_clarity, water_level,
      weather_condition, air_temp_f, wind_speed_mph, wind_direction,
      lure_bait, kept, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.tripId,
    catch_time,
    species || 'Trout',
    length_inches ?? null,
    weight_lbs ?? null,
    water_temp_f ?? null,
    water_clarity || null,
    water_level || null,
    weather_condition || null,
    air_temp_f ?? null,
    wind_speed_mph ?? null,
    wind_direction || null,
    lure_bait || null,
    kept ? 1 : 0,
    notes || null
  );
  const newCatch = db.prepare('SELECT * FROM catches WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newCatch);
});

// PUT update a catch
app.put('/api/trips/:tripId/catches/:id', (req, res) => {
  const existing = db.prepare(
    'SELECT * FROM catches WHERE id = ? AND trip_id = ?'
  ).get(req.params.id, req.params.tripId);
  if (!existing) return res.status(404).json({ error: 'Catch not found' });

  const fields = [
    'catch_time', 'species', 'length_inches', 'weight_lbs',
    'water_temp_f', 'water_clarity', 'water_level',
    'weather_condition', 'air_temp_f', 'wind_speed_mph', 'wind_direction',
    'lure_bait', 'kept', 'notes'
  ];
  const updated = {};
  for (const f of fields) {
    updated[f] = req.body[f] !== undefined ? req.body[f] : existing[f];
  }

  db.prepare(`
    UPDATE catches SET
      catch_time = ?, species = ?, length_inches = ?, weight_lbs = ?,
      water_temp_f = ?, water_clarity = ?, water_level = ?,
      weather_condition = ?, air_temp_f = ?, wind_speed_mph = ?, wind_direction = ?,
      lure_bait = ?, kept = ?, notes = ?
    WHERE id = ?
  `).run(
    updated.catch_time, updated.species, updated.length_inches, updated.weight_lbs,
    updated.water_temp_f, updated.water_clarity, updated.water_level,
    updated.weather_condition, updated.air_temp_f, updated.wind_speed_mph, updated.wind_direction,
    updated.lure_bait, updated.kept ? 1 : 0, updated.notes,
    existing.id
  );
  res.json(db.prepare('SELECT * FROM catches WHERE id = ?').get(existing.id));
});

// DELETE a catch
app.delete('/api/trips/:tripId/catches/:id', (req, res) => {
  const result = db.prepare(
    'DELETE FROM catches WHERE id = ? AND trip_id = ?'
  ).run(req.params.id, req.params.tripId);
  if (result.changes === 0) return res.status(404).json({ error: 'Catch not found' });
  res.status(204).send();
});

  return app;
}

// ── Start server ───────────────────────────────────────────────────────────

if (require.main === module) {
  const db = createDatabase(DB_PATH);
  const app = createApp(db);
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Trout Fishing Tracker running at http://localhost:${PORT}`);
  });
}

module.exports = { createApp };
