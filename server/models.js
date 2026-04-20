import mongoose from 'mongoose';

const VenueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: String,
});

const ZoneSchema = new mongoose.Schema({
  venue_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
  name: { type: String, required: true },
  capacity: Number,
  current_density_score: { type: Number, default: 0 },
  coordinates: [Number], // [lat, lng] for heatmap/map centers
});

const POISchema = new mongoose.Schema({
  zone_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
  name: { type: String, required: true },
  type: { type: String, enum: ['food', 'beverage', 'restroom', 'merch', 'exit', 'info', 'medical', 'stage'] },
  status: { type: String, enum: ['open', 'busy', 'closed'], default: 'open' },
  service_rate: { type: Number, default: 1.0 }, // minutes per person
  base_capacity: { type: Number, default: 50 },
  latitude: Number,
  longitude: Number,
});

const QueueStateSchema = new mongoose.Schema({
  poi_id: { type: mongoose.Schema.Types.ObjectId, ref: 'POI', unique: true },
  estimated_wait_minutes: { type: Number, default: 0 },
  headcount: { type: Number, default: 0 },
  trend: { type: String, enum: ['rising', 'falling', 'stable'], default: 'stable' },
  updated_at: { type: Date, default: Date.now },
});

const EventSchema = new mongoose.Schema({
  poi_id: { type: mongoose.Schema.Types.ObjectId, ref: 'POI' }, // e.g. main stage
  title: String,
  start_time: Date,
  end_time: Date,
  status: { type: String, enum: ['upcoming', 'live', 'completed'], default: 'upcoming' },
});

const VolunteerSchema = new mongoose.Schema({
  zone_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
  name: String,
  phone: String,
  status: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
});

const TaskSchema = new mongoose.Schema({
  poi_id: { type: mongoose.Schema.Types.ObjectId, ref: 'POI' },
  zone_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
  volunteer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' },
  title: String,
  description: String,
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['pending', 'active', 'resolved'], default: 'pending' },
  created_at: { type: Date, default: Date.now },
  resolved_at: Date,
});

const NotificationSchema = new mongoose.Schema({
  zone_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
  title: String,
  message: String,
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  type: { type: String, default: 'announcement' },
  created_at: { type: Date, default: Date.now },
});

export const Venue = mongoose.model('Venue', VenueSchema);
export const Zone = mongoose.model('Zone', ZoneSchema);
export const POI = mongoose.model('POI', POISchema);
export const QueueState = mongoose.model('QueueState', QueueStateSchema);
export const Event = mongoose.model('Event', EventSchema);
export const Volunteer = mongoose.model('Volunteer', VolunteerSchema);
export const Task = mongoose.model('Task', TaskSchema);
export const Notification = mongoose.model('Notification', NotificationSchema);
