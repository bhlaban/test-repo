/* global fetch, document */
'use strict';

const form = document.getElementById('entry-form');
const entryList = document.getElementById('entry-list');

async function loadEntries() {
  const res = await fetch('/api/entries');
  const entries = await res.json();
  renderEntries(entries);
}

function renderEntries(entries) {
  if (entries.length === 0) {
    entryList.innerHTML = '<p class="empty-msg">No catches logged yet. Add your first catch above!</p>';
    return;
  }
  entryList.innerHTML = entries.map(e => `
    <div class="entry-card" data-id="${e.id}">
      <div class="entry-info">
        <h3>${escapeHtml(e.species)} &mdash; ${escapeHtml(e.date)}</h3>
        ${e.weight ? `<p>⚖️ ${escapeHtml(String(e.weight))} lbs</p>` : ''}
        ${e.location ? `<p>📍 ${escapeHtml(e.location)}</p>` : ''}
        ${e.notes ? `<p>📝 ${escapeHtml(e.notes)}</p>` : ''}
      </div>
      <button class="delete-btn" data-id="${e.id}" aria-label="Delete entry">Delete</button>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = {
    date: form.date.value,
    species: form.species.value,
    weight: form.weight.value ? parseFloat(form.weight.value) : null,
    location: form.location.value,
    notes: form.notes.value,
  };
  await fetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  form.reset();
  loadEntries();
});

entryList.addEventListener('click', async (event) => {
  if (event.target.classList.contains('delete-btn')) {
    const id = event.target.dataset.id;
    await fetch(`/api/entries/${id}`, { method: 'DELETE' });
    loadEntries();
  }
});

loadEntries();
