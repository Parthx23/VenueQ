// ============================================================
// VenueFlow AI — Database Schema & Seed Data
// Maps directly to Section 10 (Data Model) of the product doc
// ============================================================
import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'venueflow.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────
db.exec(`
  DROP TABLE IF EXISTS notifications;
  DROP TABLE IF EXISTS tasks;
  DROP TABLE IF EXISTS queue_states;
  DROP TABLE IF EXISTS events;
  DROP TABLE IF EXISTS pois;
  DROP TABLE IF EXISTS zones;
  DROP TABLE IF EXISTS venues;
  DROP TABLE IF EXISTS volunteers;

  CREATE TABLE venues (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    map_url   TEXT,
    bounds    TEXT  -- JSON string [[lat,lng],[lat,lng]]
  );

  CREATE TABLE zones (
    id                    TEXT PRIMARY KEY,
    venue_id              TEXT NOT NULL REFERENCES venues(id),
    name                  TEXT NOT NULL,
    polygon_coordinates   TEXT,   -- JSON [[x,y]...]
    current_density_score REAL DEFAULT 0,
    capacity              INTEGER DEFAULT 500
  );

  CREATE TABLE pois (
    id            TEXT PRIMARY KEY,
    zone_id       TEXT NOT NULL REFERENCES zones(id),
    type          TEXT NOT NULL CHECK(type IN ('food','beverage','restroom','stage','merch','medical','exit','info')),
    name          TEXT NOT NULL,
    description   TEXT,
    latitude      REAL,
    longitude     REAL,
    status        TEXT DEFAULT 'open' CHECK(status IN ('open','busy','closed')),
    base_capacity INTEGER DEFAULT 50,
    service_rate  REAL DEFAULT 2.0  -- minutes per customer
  );

  CREATE TABLE queue_states (
    id                    TEXT PRIMARY KEY,
    poi_id                TEXT NOT NULL REFERENCES pois(id),
    estimated_wait_minutes REAL DEFAULT 0,
    headcount             INTEGER DEFAULT 0,
    trend                 TEXT DEFAULT 'stable' CHECK(trend IN ('rising','falling','stable')),
    updated_at            TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE events (
    id          TEXT PRIMARY KEY,
    poi_id      TEXT REFERENCES pois(id),  -- linked stage
    title       TEXT NOT NULL,
    artist      TEXT,
    description TEXT,
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL,
    status      TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming','live','completed'))
  );

  CREATE TABLE volunteers (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    zone_id   TEXT REFERENCES zones(id),
    status    TEXT DEFAULT 'available' CHECK(status IN ('available','busy','offline')),
    avatar    TEXT
  );

  CREATE TABLE tasks (
    id            TEXT PRIMARY KEY,
    poi_id        TEXT REFERENCES pois(id),
    zone_id       TEXT REFERENCES zones(id),
    volunteer_id  TEXT REFERENCES volunteers(id),
    title         TEXT NOT NULL,
    description   TEXT,
    priority      TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
    status        TEXT DEFAULT 'pending' CHECK(status IN ('pending','active','resolved')),
    created_at    TEXT DEFAULT (datetime('now')),
    resolved_at   TEXT
  );

  CREATE TABLE notifications (
    id          TEXT PRIMARY KEY,
    zone_id     TEXT REFERENCES zones(id),  -- NULL = global
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    severity    TEXT DEFAULT 'info' CHECK(severity IN ('info','warning','critical')),
    type        TEXT DEFAULT 'announcement' CHECK(type IN ('announcement','alert','reroute','promotion')),
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);

console.log('✓ Schema created');

// ── Seed Data ───────────────────────────────────────────────

// Venue
const venueId = uuid();
db.prepare(`INSERT INTO venues VALUES (?,?,?,?)`).run(
  venueId,
  'MetLife Stadium',
  '/maps/metlife-stadium.svg',
  JSON.stringify([[40.8128, -74.0742], [40.8148, -74.0712]])
);

// Zones
const zones = [
  { name: 'North Concourse',  capacity: 800 },
  { name: 'South Concourse',  capacity: 750 },
  { name: 'East Wing',        capacity: 600 },
  { name: 'West Wing',        capacity: 600 },
  { name: 'Main Gate Plaza',  capacity: 1200 },
  { name: 'VIP Section',      capacity: 200 },
  { name: 'Field Level',      capacity: 400 },
];

const zoneIds = {};
for (const z of zones) {
  const zid = uuid();
  zoneIds[z.name] = zid;
  db.prepare(`INSERT INTO zones (id, venue_id, name, capacity, current_density_score) VALUES (?,?,?,?,?)`).run(
    zid, venueId, z.name, z.capacity, Math.random() * 0.5
  );
}

// POIs — Food stalls, restrooms, stages, merch
const pois = [
  // Food
  { zone: 'North Concourse', type: 'food',     name: 'Burger Haven',       desc: 'Premium burgers & fries', rate: 2.4 },
  { zone: 'North Concourse', type: 'beverage', name: 'Craft Beer Station', desc: 'Local & imported drafts', rate: 1.1 },
  { zone: 'South Concourse', type: 'food',     name: 'Pizza Corner',       desc: 'Wood-fired artisan pizza', rate: 3.0 },
  { zone: 'South Concourse', type: 'food',     name: 'Taco Stand',         desc: 'Street-style tacos & burritos', rate: 1.8 },
  { zone: 'East Wing',       type: 'beverage', name: 'Smoothie Bar',       desc: 'Fresh juices & smoothies', rate: 1.5 },
  { zone: 'West Wing',       type: 'food',     name: 'Hot Dog Express',    desc: 'Classic stadium hot dogs', rate: 0.8 },
  { zone: 'Main Gate Plaza', type: 'food',     name: 'Concession Block C', desc: 'Multi-vendor food court', rate: 2.0 },

  // Restrooms
  { zone: 'North Concourse', type: 'restroom', name: 'Restrooms North A',  desc: 'Near Gate A', rate: 3.0, cap: 30 },
  { zone: 'South Concourse', type: 'restroom', name: 'Restrooms South B',  desc: 'Near Gate B', rate: 3.0, cap: 25 },
  { zone: 'East Wing',       type: 'restroom', name: 'Restrooms East',     desc: 'Accessible facilities available', rate: 3.5, cap: 20 },
  { zone: 'West Wing',       type: 'restroom', name: 'Restrooms Sector 4', desc: 'Lower concourse level', rate: 3.0, cap: 28 },

  // Merch
  { zone: 'Main Gate Plaza', type: 'merch',    name: 'Official Merch Store',desc: 'Jerseys, hats, memorabilia', rate: 4.0 },
  { zone: 'West Wing',       type: 'merch',    name: 'Merch Stand West',   desc: 'Quick-grab fan gear', rate: 2.5 },

  // Stages
  { zone: 'Field Level',     type: 'stage',    name: 'Main Stage',          desc: 'Center field performance area', rate: 0 },
  { zone: 'VIP Section',     type: 'stage',    name: 'VIP Lounge Stage',    desc: 'Intimate acoustic performances', rate: 0 },

  // Medical & Info
  { zone: 'Main Gate Plaza', type: 'medical',  name: 'First Aid Station',   desc: '24/7 medical team on standby', rate: 0 },
  { zone: 'Main Gate Plaza', type: 'info',     name: 'Info Kiosk',          desc: 'Guest services & lost items', rate: 0 },

  // Exits
  { zone: 'North Concourse', type: 'exit',     name: 'Gate A North',        desc: 'Security checkpoint exit', rate: 1.0, cap: 100 },
  { zone: 'South Concourse', type: 'exit',     name: 'Gate B South',        desc: 'Main exit to parking', rate: 1.0, cap: 120 },
];

const poiIds = {};
for (const p of pois) {
  const pid = uuid();
  poiIds[p.name] = pid;
  db.prepare(`INSERT INTO pois (id, zone_id, type, name, description, latitude, longitude, base_capacity, service_rate, status) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(pid, zoneIds[p.zone], p.type, p.name, p.desc,
      40.813 + (Math.random() - 0.5) * 0.002,
      -74.073 + (Math.random() - 0.5) * 0.002,
      p.cap || 50, p.rate, 'open');
}

// Queue States — Initial state for every POI
for (const [name, pid] of Object.entries(poiIds)) {
  const headcount = Math.floor(Math.random() * 30);
  const poi = pois.find(p => p.name === name);
  const wait = poi.rate > 0 ? Math.round(headcount * poi.rate / 3) : 0;
  db.prepare(`INSERT INTO queue_states (id, poi_id, estimated_wait_minutes, headcount, trend) VALUES (?,?,?,?,?)`)
    .run(uuid(), pid, wait, headcount, 'stable');
}

// Events — Schedule
const events = [
  { poi: 'Main Stage',       title: 'Championship Finals 2024', artist: null,            start: '2024-12-15T18:00', end: '2024-12-15T21:00', status: 'live' },
  { poi: 'Main Stage',       title: 'Halftime Show',            artist: 'The Weeknd',    start: '2024-12-15T19:30', end: '2024-12-15T19:50', status: 'upcoming' },
  { poi: 'VIP Lounge Stage', title: 'Acoustic Set',             artist: 'John Legend',   start: '2024-12-15T18:30', end: '2024-12-15T19:15', status: 'live' },
  { poi: 'VIP Lounge Stage', title: 'DJ Set',                   artist: 'Kygo',          start: '2024-12-15T20:00', end: '2024-12-15T21:00', status: 'upcoming' },
];

for (const e of events) {
  db.prepare(`INSERT INTO events (id, poi_id, title, artist, start_time, end_time, status) VALUES (?,?,?,?,?,?,?)`)
    .run(uuid(), poiIds[e.poi], e.title, e.artist, e.start, e.end, e.status);
}

// Volunteers
const volunteers = [
  { name: 'Sarah Chen',    zone: 'North Concourse' },
  { name: 'Marcus Johnson', zone: 'South Concourse' },
  { name: 'Priya Patel',   zone: 'East Wing' },
  { name: 'David Kim',     zone: 'West Wing' },
  { name: 'Emily Torres',  zone: 'Main Gate Plaza' },
  { name: 'James O\'Brien', zone: 'Main Gate Plaza' },
];

const volunteerIds = {};
for (const v of volunteers) {
  const vid = uuid();
  volunteerIds[v.name] = vid;
  db.prepare(`INSERT INTO volunteers (id, name, zone_id, status) VALUES (?,?,?,?)`)
    .run(vid, v.name, zoneIds[v.zone], 'available');
}

// Initial notifications
db.prepare(`INSERT INTO notifications (id, zone_id, title, message, severity, type) VALUES (?,?,?,?,?,?)`)
  .run(uuid(), null, 'LIVE ALERT', 'Halftime show starting in 5 mins — head to your seats!', 'warning', 'announcement');

db.prepare(`INSERT INTO notifications (id, zone_id, title, message, severity, type) VALUES (?,?,?,?,?,?)`)
  .run(uuid(), zoneIds['South Concourse'], 'Reroute Advisory', 'South restrooms are at capacity. East Wing restrooms have 0 wait.', 'info', 'reroute');

console.log('✓ Seed data inserted');
console.log(`  • 1 venue, ${zones.length} zones, ${pois.length} POIs`);
console.log(`  • ${events.length} events, ${volunteers.length} volunteers`);

db.close();
