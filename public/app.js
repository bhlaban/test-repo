/* ── State ──────────────────────────────────────────────────────────────── */
let currentTripId = null;

/* ── Utilities ──────────────────────────────────────────────────────────── */
function fmt(dtStr) {
  if (!dtStr) return '—';
  return new Date(dtStr).toLocaleString(undefined, {
    dateStyle: 'medium', timeStyle: 'short'
  });
}

function toLocalDatetimeValue(dtStr) {
  if (!dtStr) return '';
  // Convert ISO/UTC string to local datetime-local value
  const d = new Date(dtStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  setTimeout(() => t.classList.add('hidden'), 2800);
}

function confirm(message) {
  return new Promise(resolve => {
    document.getElementById('confirm-message').textContent = message;
    const overlay = document.getElementById('confirm-overlay');
    overlay.classList.remove('hidden');
    const yes = document.getElementById('confirm-yes');
    const no  = document.getElementById('confirm-no');
    function cleanup(result) {
      overlay.classList.add('hidden');
      yes.removeEventListener('click', onYes);
      no.removeEventListener('click', onNo);
      resolve(result);
    }
    function onYes() { cleanup(true); }
    function onNo()  { cleanup(false); }
    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
  });
}

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

/* ── Panel helpers ──────────────────────────────────────────────────────── */
function showTripsPanel() {
  document.getElementById('trips-panel').classList.remove('hidden');
  document.getElementById('catches-panel').classList.add('hidden');
  currentTripId = null;
  loadTrips();
}

function showCatchesPanel(tripId) {
  currentTripId = tripId;
  document.getElementById('trips-panel').classList.add('hidden');
  document.getElementById('catches-panel').classList.remove('hidden');
  hideCatchForm();
  loadTripDetail(tripId);
}

/* ── Trips ──────────────────────────────────────────────────────────────── */
async function loadTrips() {
  const trips = await api('GET', '/api/trips');
  const list  = document.getElementById('trips-list');
  const empty = document.getElementById('trips-empty');

  // Remove old cards
  list.querySelectorAll('.trip-card').forEach(el => el.remove());

  if (!trips.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  trips.forEach(trip => list.appendChild(buildTripCard(trip)));
}

function buildTripCard(trip) {
  const card = document.createElement('div');
  card.className = 'trip-card';
  card.dataset.id = trip.id;

  const isActive = !trip.end_time;
  const duration = trip.end_time
    ? calcDuration(trip.start_time, trip.end_time)
    : '<em>In progress</em>';

  card.innerHTML = `
    <div class="trip-card-body">
      <div class="trip-card-title">${escHtml(trip.location || 'Unnamed Trip')} <span class="${isActive ? 'trip-card-badge active' : 'trip-card-badge'}">${isActive ? 'Active' : 'Completed'}</span></div>
      <div class="trip-card-meta">
        <span>📅 ${fmt(trip.start_time)}</span>
        ${trip.end_time ? `<span>— ${fmt(trip.end_time)}</span>` : ''}
        <span>⏱ ${duration}</span>
      </div>
      ${trip.notes ? `<div class="trip-card-meta">${escHtml(trip.notes)}</div>` : ''}
    </div>
    <div class="trip-card-actions">
      <button class="btn btn-sm btn-secondary btn-edit-trip" data-id="${trip.id}">Edit</button>
      <button class="btn btn-sm btn-danger btn-delete-trip" data-id="${trip.id}">Delete</button>
    </div>
  `;

  // Click body → open catches panel
  card.querySelector('.trip-card-body').addEventListener('click', () => showCatchesPanel(trip.id));

  card.querySelector('.btn-edit-trip').addEventListener('click', e => {
    e.stopPropagation();
    openTripForm(trip);
  });

  card.querySelector('.btn-delete-trip').addEventListener('click', async e => {
    e.stopPropagation();
    const ok = await confirm(`Delete trip "${trip.location || 'Unnamed Trip'}"? All catches will also be deleted.`);
    if (!ok) return;
    try {
      await api('DELETE', `/api/trips/${trip.id}`);
      showToast('Trip deleted.');
      loadTrips();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  return card;
}

function openTripForm(trip = null) {
  const container = document.getElementById('trip-form-container');
  const title = document.getElementById('trip-form-title');
  container.classList.remove('hidden');
  document.getElementById('trip-id').value = trip ? trip.id : '';
  document.getElementById('trip-start').value = trip ? toLocalDatetimeValue(trip.start_time) : nowLocal();
  document.getElementById('trip-end').value   = trip ? toLocalDatetimeValue(trip.end_time) : '';
  document.getElementById('trip-location').value = trip ? (trip.location || '') : '';
  document.getElementById('trip-notes').value    = trip ? (trip.notes || '') : '';
  title.textContent = trip ? 'Edit Trip' : 'Start a New Trip';
  document.getElementById('trip-submit-btn').textContent = trip ? 'Update Trip' : 'Save Trip';
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideTripForm() {
  document.getElementById('trip-form-container').classList.add('hidden');
  document.getElementById('trip-form').reset();
}

document.getElementById('btn-new-trip').addEventListener('click', () => openTripForm());
document.getElementById('btn-cancel-trip').addEventListener('click', hideTripForm);

document.getElementById('trip-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id    = document.getElementById('trip-id').value;
  const body  = {
    start_time: document.getElementById('trip-start').value,
    end_time:   document.getElementById('trip-end').value || null,
    location:   document.getElementById('trip-location').value || null,
    notes:      document.getElementById('trip-notes').value || null,
  };
  try {
    if (id) {
      await api('PUT', `/api/trips/${id}`, body);
      showToast('Trip updated.');
    } else {
      await api('POST', '/api/trips', body);
      showToast('Trip started!');
    }
    hideTripForm();
    loadTrips();
  } catch (err) {
    showToast(err.message, true);
  }
});

/* ── Trip Detail ────────────────────────────────────────────────────────── */
async function loadTripDetail(tripId) {
  const trip = await api('GET', `/api/trips/${tripId}`);

  // Summary
  const summary = document.getElementById('trip-summary');
  summary.innerHTML = `
    <div class="summary-row">
      <div><strong>Location:</strong>${escHtml(trip.location || '—')}</div>
      <div><strong>Started:</strong>${fmt(trip.start_time)}</div>
      <div><strong>Ended:</strong>${fmt(trip.end_time)}</div>
      <div><strong>Duration:</strong>${trip.end_time ? calcDuration(trip.start_time, trip.end_time) : '<em>In progress</em>'}</div>
      <div><strong>Catches:</strong>${trip.catches.length}</div>
    </div>
    ${trip.notes ? `<div><strong>Notes:</strong>${escHtml(trip.notes)}</div>` : ''}
  `;

  document.getElementById('catches-panel-title').textContent =
    trip.location ? `${trip.location} — Catches` : 'Trip Catches';

  // Catch cards
  const list  = document.getElementById('catches-list');
  const empty = document.getElementById('catches-empty');
  list.querySelectorAll('.catch-card').forEach(el => el.remove());

  if (!trip.catches.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  trip.catches.forEach(c => list.appendChild(buildCatchCard(c)));
}

/* ── Catches ────────────────────────────────────────────────────────────── */
function buildCatchCard(c) {
  const card = document.createElement('div');
  card.className = 'catch-card';
  card.dataset.id = c.id;

  const kept = c.kept
    ? '<span class="badge-kept">Kept</span>'
    : '<span class="badge-released">Released</span>';

  card.innerHTML = `
    <div class="catch-card-header">
      <div>
        <span class="catch-card-title">🐟 ${escHtml(c.species)} ${kept}</span>
        <span class="catch-card-time">  ${fmt(c.catch_time)}</span>
      </div>
      <div class="catch-card-actions">
        <button class="btn btn-sm btn-secondary btn-edit-catch">Edit</button>
        <button class="btn btn-sm btn-danger btn-delete-catch">Delete</button>
      </div>
    </div>
    <div class="catch-details">
      ${detail('Length', c.length_inches != null ? `${c.length_inches}"` : null)}
      ${detail('Weight', c.weight_lbs    != null ? `${c.weight_lbs} lbs` : null)}
      ${detail('Lure/Bait', c.lure_bait)}
      ${detail('Water Temp', c.water_temp_f  != null ? `${c.water_temp_f}°F` : null)}
      ${detail('Clarity', c.water_clarity)}
      ${detail('Water Level', c.water_level)}
      ${detail('Weather', c.weather_condition)}
      ${detail('Air Temp', c.air_temp_f    != null ? `${c.air_temp_f}°F` : null)}
      ${detail('Wind', windStr(c))}
      ${detail('Notes', c.notes)}
    </div>
  `;

  card.querySelector('.btn-edit-catch').addEventListener('click', () => openCatchForm(c));
  card.querySelector('.btn-delete-catch').addEventListener('click', async () => {
    const ok = await confirm('Delete this catch record?');
    if (!ok) return;
    try {
      await api('DELETE', `/api/trips/${currentTripId}/catches/${c.id}`);
      showToast('Catch deleted.');
      loadTripDetail(currentTripId);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  return card;
}

function detail(label, value) {
  if (!value) return '';
  return `<div><span class="catch-detail-label">${label}: </span><span class="catch-detail-value">${escHtml(String(value))}</span></div>`;
}

function windStr(c) {
  if (!c.wind_speed_mph && !c.wind_direction) return null;
  return [c.wind_speed_mph != null ? `${c.wind_speed_mph} mph` : '', c.wind_direction || ''].filter(Boolean).join(' ');
}

function openCatchForm(c = null) {
  const container = document.getElementById('catch-form-container');
  container.classList.remove('hidden');
  document.getElementById('catch-id').value = c ? c.id : '';
  document.getElementById('catch-time').value    = c ? toLocalDatetimeValue(c.catch_time) : nowLocal();
  document.getElementById('catch-species').value = c ? (c.species || 'Trout') : 'Trout';
  document.getElementById('catch-length').value  = c ? (c.length_inches ?? '') : '';
  document.getElementById('catch-weight').value  = c ? (c.weight_lbs    ?? '') : '';
  document.getElementById('catch-lure').value    = c ? (c.lure_bait    || '') : '';
  document.getElementById('catch-kept').value    = c ? String(c.kept) : '0';
  document.getElementById('catch-water-temp').value    = c ? (c.water_temp_f  ?? '') : '';
  document.getElementById('catch-water-clarity').value = c ? (c.water_clarity || '') : '';
  document.getElementById('catch-water-level').value   = c ? (c.water_level   || '') : '';
  document.getElementById('catch-weather').value       = c ? (c.weather_condition || '') : '';
  document.getElementById('catch-air-temp').value      = c ? (c.air_temp_f    ?? '') : '';
  document.getElementById('catch-wind-speed').value    = c ? (c.wind_speed_mph ?? '') : '';
  document.getElementById('catch-wind-dir').value      = c ? (c.wind_direction || '') : '';
  document.getElementById('catch-notes').value         = c ? (c.notes || '') : '';

  document.getElementById('catch-form-title').textContent = c ? 'Edit Catch' : 'Log a Catch';
  document.getElementById('catch-submit-btn').textContent = c ? 'Update Catch' : 'Save Catch';
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideCatchForm() {
  document.getElementById('catch-form-container').classList.add('hidden');
  document.getElementById('catch-form').reset();
}

document.getElementById('btn-new-catch').addEventListener('click', () => openCatchForm());
document.getElementById('btn-cancel-catch').addEventListener('click', hideCatchForm);
document.getElementById('btn-back').addEventListener('click', showTripsPanel);

document.getElementById('catch-form').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('catch-id').value;
  const body = {
    catch_time:        document.getElementById('catch-time').value,
    species:           document.getElementById('catch-species').value || 'Trout',
    length_inches:     numOrNull('catch-length'),
    weight_lbs:        numOrNull('catch-weight'),
    lure_bait:         document.getElementById('catch-lure').value || null,
    kept:              document.getElementById('catch-kept').value === '1',
    water_temp_f:      numOrNull('catch-water-temp'),
    water_clarity:     document.getElementById('catch-water-clarity').value || null,
    water_level:       document.getElementById('catch-water-level').value || null,
    weather_condition: document.getElementById('catch-weather').value || null,
    air_temp_f:        numOrNull('catch-air-temp'),
    wind_speed_mph:    numOrNull('catch-wind-speed'),
    wind_direction:    document.getElementById('catch-wind-dir').value || null,
    notes:             document.getElementById('catch-notes').value || null,
  };
  try {
    if (id) {
      await api('PUT', `/api/trips/${currentTripId}/catches/${id}`, body);
      showToast('Catch updated.');
    } else {
      await api('POST', `/api/trips/${currentTripId}/catches`, body);
      showToast('Catch logged!');
    }
    hideCatchForm();
    loadTripDetail(currentTripId);
  } catch (err) {
    showToast(err.message, true);
  }
});

/* ── Helpers ────────────────────────────────────────────────────────────── */
function nowLocal() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function numOrNull(id) {
  const v = document.getElementById(id).value;
  return v !== '' ? Number(v) : null;
}

function calcDuration(start, end) {
  const ms = new Date(end) - new Date(start);
  const h  = Math.floor(ms / 3600000);
  const m  = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Init ───────────────────────────────────────────────────────────────── */
showTripsPanel();
