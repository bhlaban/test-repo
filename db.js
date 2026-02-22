const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'fishing.db');

function createDatabase(dbPath) {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      location TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS catches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      catch_time TEXT NOT NULL,
      species TEXT NOT NULL DEFAULT 'Trout',
      length_inches REAL,
      weight_lbs REAL,
      water_temp_f REAL,
      water_clarity TEXT,
      water_level TEXT,
      weather_condition TEXT,
      air_temp_f REAL,
      wind_speed_mph REAL,
      wind_direction TEXT,
      lure_bait TEXT,
      kept INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
  `);

  return db;
}

module.exports = { createDatabase, DB_PATH };
