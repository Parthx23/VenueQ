import 'dotenv/config';
import mongoose from 'mongoose';
import { Venue, Zone, POI, QueueState, Event, Volunteer, Notification } from './models.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Venue.deleteMany({});
    await Zone.deleteMany({});
    await POI.deleteMany({});
    await QueueState.deleteMany({});
    await Event.deleteMany({});
    await Volunteer.deleteMany({});
    await Notification.deleteMany({});

    console.log('✓ Cleared existing collections');

    // Venue
    const venue = new Venue({ name: 'MetLife Stadium', location: 'East Rutherford, NJ' });
    await venue.save();

    // Zones
    const zonesData = [
      { name: 'North Concourse', capacity: 800 },
      { name: 'South Concourse', capacity: 750 },
      { name: 'East Wing', capacity: 600 },
      { name: 'West Wing', capacity: 600 },
      { name: 'Main Gate Plaza', capacity: 1200 },
      { name: 'VIP Section', capacity: 200 },
      { name: 'Field Level', capacity: 400 },
    ];

    const savedZones = {};
    for (const z of zonesData) {
      const zone = new Zone({ ...z, venue_id: venue._id, current_density_score: Math.random() * 0.5 });
      await zone.save();
      savedZones[z.name] = zone._id;
    }

    // POIs
    const poisData = [
      { zone: 'North Concourse', type: 'food', name: 'Burger Haven', rate: 2.4 },
      { zone: 'North Concourse', type: 'beverage', name: 'Craft Beer Station', rate: 1.1 },
      { zone: 'South Concourse', type: 'food', name: 'Pizza Corner', rate: 3.0 },
      { zone: 'East Wing', type: 'beverage', name: 'Smoothie Bar', rate: 1.5 },
      { zone: 'Main Gate Plaza', type: 'merch', name: 'Official Merch Store', rate: 4.0 },
      { zone: 'Field Level', type: 'stage', name: 'Main Stage', rate: 0 },
      { zone: 'North Concourse', type: 'restroom', name: 'Restrooms North A', rate: 3.0 },
    ];

    for (const p of poisData) {
      const poi = new POI({
        ...p,
        zone_id: savedZones[p.zone],
        status: 'open',
        base_capacity: 50,
        latitude: 40.813 + (Math.random() - 0.5) * 0.002,
        longitude: -74.073 + (Math.random() - 0.5) * 0.002,
        service_rate: p.rate || 1.0
      });
      await poi.save();

      // Initial Queue State
      const headcount = Math.floor(Math.random() * 30);
      const wait = p.rate > 0 ? Math.round(headcount * p.rate / 3) : 0;
      await new QueueState({ poi_id: poi._id, headcount, estimated_wait_minutes: wait, trend: 'stable' }).save();
    }

    // Volunteers
    const volunteersData = [
      { name: 'Sarah Chen', zone: 'North Concourse' },
      { name: 'Marcus Johnson', zone: 'South Concourse' },
      { name: 'Priya Patel', zone: 'East Wing' },
    ];

    for (const v of volunteersData) {
      await new Volunteer({ name: v.name, zone_id: savedZones[v.zone], status: 'available' }).save();
    }

    // Notifications
    await new Notification({ title: 'LIVE ALERT', message: 'Halftime show starting in 5 mins!', severity: 'warning' }).save();

    console.log('✓ Seed data inserted successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
