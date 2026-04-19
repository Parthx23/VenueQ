// ============================================================
// VenueFlow AI — Main Server
// Express REST API + Socket.IO Real-time Layer + Simulator
// Maps to Section 8 (Functional Reqs) & Section 11 (Workflow)
// ============================================================
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSimulator } from './simulator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// ── Server Setup ────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
});

app.use(cors());
app.use(express.json());

// ── Database ────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'venueflow.db'), { readonly: false });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════
//  REST API ROUTES
// ═══════════════════════════════════════════════════════════

// ── Venues ──────────────────────────────────────────────────
app.get('/api/venues', (req, res) => {
  const venues = db.prepare('SELECT * FROM venues').all();
  res.json(venues);
});

app.get('/api/venues/:id', (req, res) => {
  const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(req.params.id);
  if (!venue) return res.status(404).json({ error: 'Venue not found' });
  res.json(venue);
});

// ── Zones ───────────────────────────────────────────────────
app.get('/api/zones', (req, res) => {
  const zones = db.prepare(`
    SELECT z.*, v.name as venue_name
    FROM zones z
    JOIN venues v ON z.venue_id = v.id
    ORDER BY z.name
  `).all();
  res.json(zones);
});

app.get('/api/zones/:id', (req, res) => {
  const zone = db.prepare('SELECT * FROM zones WHERE id = ?').get(req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  res.json(zone);
});

app.get('/api/zones/:id/density', (req, res) => {
  const zone = db.prepare('SELECT id, name, current_density_score, capacity FROM zones WHERE id = ?').get(req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  res.json({
    ...zone,
    severity: zone.current_density_score > 0.8 ? 'critical' : zone.current_density_score > 0.5 ? 'warning' : 'normal',
  });
});

// ── POIs (Stalls, Restrooms, Stages, etc.) ──────────────────
app.get('/api/pois', (req, res) => {
  const { type, zone_id, status } = req.query;
  let query = `
    SELECT p.*, z.name as zone_name,
           qs.estimated_wait_minutes, qs.headcount, qs.trend, qs.updated_at as queue_updated_at
    FROM pois p
    JOIN zones z ON p.zone_id = z.id
    LEFT JOIN queue_states qs ON qs.poi_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (type) { query += ` AND p.type = ?`; params.push(type); }
  if (zone_id) { query += ` AND p.zone_id = ?`; params.push(zone_id); }
  if (status) { query += ` AND p.status = ?`; params.push(status); }
  query += ` ORDER BY qs.estimated_wait_minutes ASC`;
  
  const pois = db.prepare(query).all(...params);
  res.json(pois);
});

app.get('/api/pois/:id', (req, res) => {
  const poi = db.prepare(`
    SELECT p.*, z.name as zone_name,
           qs.estimated_wait_minutes, qs.headcount, qs.trend, qs.updated_at as queue_updated_at
    FROM pois p
    JOIN zones z ON p.zone_id = z.id
    LEFT JOIN queue_states qs ON qs.poi_id = p.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!poi) return res.status(404).json({ error: 'POI not found' });
  res.json(poi);
});

// Update POI status (Admin/Stall Operator action)
app.patch('/api/pois/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['open', 'busy', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be: open, busy, or closed' });
  }
  db.prepare('UPDATE pois SET status = ? WHERE id = ?').run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM pois WHERE id = ?').get(req.params.id);
  io.emit('poi_status_change', updated);
  res.json(updated);
});

// ── Queue States (Live Data) ────────────────────────────────
app.get('/api/queues', (req, res) => {
  const queues = db.prepare(`
    SELECT qs.*, p.name as poi_name, p.type as poi_type, z.name as zone_name
    FROM queue_states qs
    JOIN pois p ON qs.poi_id = p.id
    JOIN zones z ON p.zone_id = z.id
    ORDER BY qs.estimated_wait_minutes DESC
  `).all();
  res.json(queues);
});

// Manual override of queue time (Admin action — Section 8)
app.patch('/api/queues/:poi_id/override', (req, res) => {
  const { estimated_wait_minutes, headcount } = req.body;
  db.prepare(`
    UPDATE queue_states 
    SET estimated_wait_minutes = ?, headcount = ?, updated_at = datetime('now')
    WHERE poi_id = ?
  `).run(estimated_wait_minutes, headcount, req.params.poi_id);
  const updated = db.prepare('SELECT * FROM queue_states WHERE poi_id = ?').get(req.params.poi_id);
  io.emit('queue_override', updated);
  res.json(updated);
});

// ── Events / Schedule ───────────────────────────────────────
app.get('/api/events', (req, res) => {
  const events = db.prepare(`
    SELECT e.*, p.name as venue_location, p.type as location_type, z.name as zone_name
    FROM events e
    LEFT JOIN pois p ON e.poi_id = p.id
    LEFT JOIN zones z ON p.zone_id = z.id
    ORDER BY e.start_time ASC
  `).all();
  res.json(events);
});

app.get('/api/events/:id', (req, res) => {
  const event = db.prepare(`
    SELECT e.*, p.name as venue_location
    FROM events e
    LEFT JOIN pois p ON e.poi_id = p.id
    WHERE e.id = ?
  `).get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

app.patch('/api/events/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['upcoming', 'live', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare('UPDATE events SET status = ? WHERE id = ?').run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  io.emit('event_status_change', updated);
  res.json(updated);
});

// ── Volunteers ──────────────────────────────────────────────
app.get('/api/volunteers', (req, res) => {
  const volunteers = db.prepare(`
    SELECT v.*, z.name as zone_name,
           (SELECT COUNT(*) FROM tasks t WHERE t.volunteer_id = v.id AND t.status = 'active') as active_tasks
    FROM volunteers v
    LEFT JOIN zones z ON v.zone_id = z.id
    ORDER BY v.name
  `).all();
  res.json(volunteers);
});

app.patch('/api/volunteers/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE volunteers SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json(db.prepare('SELECT * FROM volunteers WHERE id = ?').get(req.params.id));
});

// ── Tasks (Volunteer Coordination — Section 5) ──────────────
app.get('/api/tasks', (req, res) => {
  const { status, volunteer_id } = req.query;
  let query = `
    SELECT t.*, p.name as poi_name, z.name as zone_name, v.name as volunteer_name
    FROM tasks t
    LEFT JOIN pois p ON t.poi_id = p.id
    LEFT JOIN zones z ON t.zone_id = z.id
    LEFT JOIN volunteers v ON t.volunteer_id = v.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { query += ` AND t.status = ?`; params.push(status); }
  if (volunteer_id) { query += ` AND t.volunteer_id = ?`; params.push(volunteer_id); }
  query += ` ORDER BY CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.created_at DESC`;

  res.json(db.prepare(query).all(...params));
});

// Create task (Admin action — dispatch volunteer)
app.post('/api/tasks', (req, res) => {
  const { poi_id, zone_id, volunteer_id, title, description, priority } = req.body;
  const id = uuid();
  db.prepare(`
    INSERT INTO tasks (id, poi_id, zone_id, volunteer_id, title, description, priority, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(id, poi_id || null, zone_id || null, volunteer_id || null, title, description || '', priority || 'medium');

  // Mark volunteer as busy
  if (volunteer_id) {
    db.prepare('UPDATE volunteers SET status = ? WHERE id = ?').run('busy', volunteer_id);
  }

  const task = db.prepare(`
    SELECT t.*, v.name as volunteer_name, p.name as poi_name, z.name as zone_name
    FROM tasks t
    LEFT JOIN volunteers v ON t.volunteer_id = v.id
    LEFT JOIN pois p ON t.poi_id = p.id
    LEFT JOIN zones z ON t.zone_id = z.id
    WHERE t.id = ?
  `).get(id);

  io.emit('task_created', task);
  io.emit('volunteer_dispatched', { volunteer_id, task_id: id, task_title: title });
  res.status(201).json(task);
});

// Update task status (Volunteer action — accept/resolve)
app.patch('/api/tasks/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['pending', 'active', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const updates = { status };
  if (status === 'resolved') updates.resolved_at = new Date().toISOString();

  db.prepare(`UPDATE tasks SET status = ?, resolved_at = ? WHERE id = ?`)
    .run(status, updates.resolved_at || null, req.params.id);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  // Free up volunteer if task resolved
  if (status === 'resolved' && task.volunteer_id) {
    const otherActive = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE volunteer_id = ? AND status IN (?,?)').get(task.volunteer_id, 'pending', 'active');
    if (otherActive.c === 0) {
      db.prepare('UPDATE volunteers SET status = ? WHERE id = ?').run('available', task.volunteer_id);
    }
  }

  io.emit('task_updated', task);
  res.json(task);
});

// ── Notifications (Push to attendees — Section 5) ───────────
app.get('/api/notifications', (req, res) => {
  const notifs = db.prepare(`
    SELECT n.*, z.name as zone_name
    FROM notifications n
    LEFT JOIN zones z ON n.zone_id = z.id
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all();
  res.json(notifs);
});

// Send notification (Admin action)
app.post('/api/notifications', (req, res) => {
  const { zone_id, title, message, severity, type } = req.body;
  const id = uuid();
  db.prepare(`
    INSERT INTO notifications (id, zone_id, title, message, severity, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, zone_id || null, title, message, severity || 'info', type || 'announcement');

  const notif = db.prepare(`
    SELECT n.*, z.name as zone_name
    FROM notifications n
    LEFT JOIN zones z ON n.zone_id = z.id
    WHERE n.id = ?
  `).get(id);

  // Broadcast to all attendee clients
  io.emit('notification', notif);
  res.status(201).json(notif);
});

// ── Dashboard Metrics (Admin — Section 7) ───────────────────
app.get('/api/dashboard/metrics', (req, res) => {
  const totalPois = db.prepare('SELECT COUNT(*) as count FROM pois').get();
  const avgWait = db.prepare('SELECT ROUND(AVG(estimated_wait_minutes), 1) as avg FROM queue_states').get();
  const maxWait = db.prepare(`
    SELECT qs.estimated_wait_minutes as wait, p.name as poi_name 
    FROM queue_states qs JOIN pois p ON qs.poi_id = p.id 
    ORDER BY qs.estimated_wait_minutes DESC LIMIT 1
  `).get();
  const criticalZones = db.prepare('SELECT COUNT(*) as count FROM zones WHERE current_density_score > 0.8').get();
  const activeTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending','active')").get();
  const availableVolunteers = db.prepare("SELECT COUNT(*) as count FROM volunteers WHERE status = 'available'").get();
  const totalHeadcount = db.prepare('SELECT SUM(headcount) as total FROM queue_states').get();

  res.json({
    total_pois: totalPois.count,
    average_wait_minutes: avgWait.avg || 0,
    worst_queue: maxWait || { wait: 0, poi_name: 'N/A' },
    critical_zones: criticalZones.count,
    active_tasks: activeTasks.count,
    available_volunteers: availableVolunteers.count,
    total_headcount: totalHeadcount.total || 0,
  });
});

// ── Simulation Controls (Demo — Section 14) ─────────────────
let simulator = null;

app.post('/api/simulate/surge', (req, res) => {
  const { zone_id } = req.body;
  if (!zone_id) return res.status(400).json({ error: 'zone_id required' });
  if (simulator) simulator.triggerSurge(zone_id);
  res.json({ message: 'Surge triggered', zone_id });
});

app.post('/api/simulate/halftime', (req, res) => {
  // Force all food/bev/restroom queues to spike
  const foodPois = db.prepare("SELECT id, base_capacity FROM pois WHERE type IN ('food','beverage','restroom')").all();
  for (const p of foodPois) {
    const spikeCount = Math.floor(p.base_capacity * (0.8 + Math.random() * 0.5));
    db.prepare('UPDATE queue_states SET headcount = ?, trend = ? WHERE poi_id = ?')
      .run(spikeCount, 'rising', p.id);
  }
  io.emit('alert', { type: 'halftime_rush', message: 'HALFTIME RUSH — All concession queues surging' });
  res.json({ message: 'Halftime rush triggered' });
});

// ═══════════════════════════════════════════════════════════
//  SOCKET.IO EVENTS
// ═══════════════════════════════════════════════════════════
io.on('connection', (socket) => {
  console.log(`  🔌 Client connected: ${socket.id}`);

  // Send initial state on connect
  const queues = db.prepare(`
    SELECT qs.*, p.name as poi_name, p.type as poi_type, z.name as zone_name
    FROM queue_states qs
    JOIN pois p ON qs.poi_id = p.id
    JOIN zones z ON p.zone_id = z.id
  `).all();
  socket.emit('initial_state', { queues });

  socket.on('disconnect', () => {
    console.log(`  🔌 Client disconnected: ${socket.id}`);
  });
});

// ═══════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════
httpServer.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║     VenueQ — Backend Engine              ║');
  console.log(`  ║     http://localhost:${PORT}                ║`);
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
  console.log('  📡 REST API ready');
  console.log('  🔌 WebSocket server ready');

  // Start the crowd simulator
  simulator = createSimulator(db, io);
  simulator.start();
  console.log('');
});
