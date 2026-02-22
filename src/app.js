'use strict';

const express = require('express');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for trout log entries
let entries = [];
let nextId = 1;

// GET all entries
app.get('/api/entries', (req, res) => {
  res.json(entries);
});

// GET a single entry by id
app.get('/api/entries/:id', (req, res) => {
  const entry = entries.find(e => e.id === parseInt(req.params.id));
  if (!entry) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  res.json(entry);
});

// POST a new entry
app.post('/api/entries', (req, res) => {
  const { date, species, weight, location, notes } = req.body;
  if (!date || !species) {
    return res.status(400).json({ error: 'date and species are required' });
  }
  const entry = { id: nextId++, date, species, weight: weight || null, location: location || '', notes: notes || '' };
  entries.push(entry);
  res.status(201).json(entry);
});

// DELETE an entry
app.delete('/api/entries/:id', (req, res) => {
  const index = entries.findIndex(e => e.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  entries.splice(index, 1);
  res.status(204).send();
});

// Reset store (used in tests)
app.resetStore = () => {
  entries = [];
  nextId = 1;
};

module.exports = app;
