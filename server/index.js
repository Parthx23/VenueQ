import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import { Venue, Zone, POI, QueueState, Event, Volunteer, Task, Notification } from './models.js';
import { createSimulator } from './simulator.js';

const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

// ── Server Setup ────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ── Database Connection ─────────────────────────────────────
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// ═══════════════════════════════════════════════════════════
//  REST API ROUTES
// ═══════════════════════════════════════════════════════════

app.get('/api/venues', async (req, res) => {
  const venues = await Venue.find();
  res.json(venues);
});

app.get('/api/zones', async (req, res) => {
  const zones = await Zone.find().populate('venue_id', 'name');
  res.json(zones);
});

app.get('/api/zones/:id/density', async (req, res) => {
  const zone = await Zone.findById(req.params.id);
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  res.json({
    ...zone.toObject(),
    severity: zone.current_density_score > 0.8 ? 'critical' : zone.current_density_score > 0.5 ? 'warning' : 'normal',
  });
});

app.get('/api/pois', async (req, res) => {
  const { type, zone_id, status } = req.query;
  const filter = {};
  if (type) filter.type = type.toLowerCase();
  if (zone_id) filter.zone_id = zone_id;
  if (status) filter.status = status;

  const pois = await POI.find(filter).lean();
  const poiIds = pois.map(p => p._id);
  const queues = await QueueState.find({ poi_id: { $in: poiIds } });

  const combined = pois.map(p => {
    const q = queues.find(qs => qs.poi_id.toString() === p._id.toString());
    return { ...p, ...q?.toObject(), id: p._id };
  });

  res.json(combined);
});

app.patch('/api/pois/:id/status', async (req, res) => {
  const { status } = req.body;
  const poi = await POI.findByIdAndUpdate(req.params.id, { status }, { new: true });
  io.emit('poi_status_change', poi);
  res.json(poi);
});

app.get('/api/queues', async (req, res) => {
  const queues = await QueueState.find()
    .populate({ path: 'poi_id', populate: { path: 'zone_id' } })
    .lean();
  
  const formatted = queues.map(q => ({
    ...q,
    poi_name: q.poi_id?.name,
    poi_type: q.poi_id?.type,
    zone_name: q.poi_id?.zone_id?.name
  }));
  res.json(formatted);
});

app.patch('/api/queues/:poi_id/override', async (req, res) => {
  const { estimated_wait_minutes, headcount } = req.body;
  const updated = await QueueState.findOneAndUpdate(
    { poi_id: req.params.poi_id },
    { estimated_wait_minutes, headcount, updated_at: new Date() },
    { new: true }
  );
  io.emit('queue_override', updated);
  res.json(updated);
});

app.get('/api/events', async (req, res) => {
  const events = await Event.find().populate({ path: 'poi_id', populate: { path: 'zone_id' } }).lean();
  res.json(events);
});

app.get('/api/volunteers', async (req, res) => {
  const volunteers = await Volunteer.find().populate('zone_id').lean();
  res.json(volunteers);
});

app.get('/api/tasks', async (req, res) => {
  const { status, volunteer_id } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (volunteer_id) filter.volunteer_id = volunteer_id;

  const tasks = await Task.find(filter)
    .populate('poi_id zone_id volunteer_id')
    .sort({ priority: 1, created_at: -1 });
  res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
  const task = new Task(req.body);
  await task.save();
  if (task.volunteer_id) {
    await Volunteer.findByIdAndUpdate(task.volunteer_id, { status: 'busy' });
  }
  const populated = await Task.findById(task._id).populate('volunteer_id poi_id zone_id');
  io.emit('task_created', populated);
  res.status(201).json(populated);
});

app.patch('/api/tasks/:id/status', async (req, res) => {
  const { status } = req.body;
  const task = await Task.findByIdAndUpdate(req.params.id, { 
    status, 
    resolved_at: status === 'resolved' ? new Date() : undefined 
  }, { new: true });

  if (status === 'resolved' && task.volunteer_id) {
    const activeTasks = await Task.countDocuments({ volunteer_id: task.volunteer_id, status: { $in: ['pending', 'active'] } });
    if (activeTasks === 0) {
      await Volunteer.findByIdAndUpdate(task.volunteer_id, { status: 'available' });
    }
  }
  io.emit('task_updated', task);
  res.json(task);
});

app.get('/api/notifications', async (req, res) => {
  const notifs = await Notification.find().populate('zone_id').sort({ created_at: -1 }).limit(50);
  res.json(notifs);
});

app.post('/api/notifications', async (req, res) => {
  const notif = new Notification(req.body);
  await notif.save();
  const populated = await Notification.findById(notif._id).populate('zone_id');
  io.emit('notification', populated);
  res.status(201).json(populated);
});

app.get('/api/dashboard/metrics', async (req, res) => {
  const [totalPois, queues, criticalZones, activeTasks, availableVolunteers] = await Promise.all([
    POI.countDocuments(),
    QueueState.find().lean(),
    Zone.countDocuments({ current_density_score: { $gt: 0.8 } }),
    Task.countDocuments({ status: { $in: ['pending', 'active'] } }),
    Volunteer.countDocuments({ status: 'available' })
  ]);

  const totalHeadcount = queues.reduce((sum, q) => sum + q.headcount, 0);
  const avgWait = queues.length ? (queues.reduce((sum, q) => sum + q.estimated_wait_minutes, 0) / queues.length).toFixed(1) : 0;
  
  res.json({
    total_pois: totalPois,
    average_wait_minutes: avgWait,
    critical_zones: criticalZones,
    active_tasks: activeTasks,
    available_volunteers: availableVolunteers,
    total_headcount: totalHeadcount,
  });
});

let simulator = null;
app.post('/api/simulate/surge', (req, res) => {
  if (simulator) simulator.triggerSurge(req.body.zone_id);
  res.json({ message: 'Surge triggered' });
});

// ── Socket.IO ───────────────────────────────────────────────
io.on('connection', async (socket) => {
  const queues = await QueueState.find().populate('poi_id').lean();
  socket.emit('initial_state', { queues });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  simulator = createSimulator(mongoose, io);
  simulator.start();
});
