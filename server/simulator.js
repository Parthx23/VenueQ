import { POI, Zone, QueueState } from './models.js';

export function createSimulator(mongoose, io) {
  const TICK_INTERVAL_MS = 3000;
  const SURGE_PROBABILITY = 0.02;
  const CRITICAL_WAIT_THRESHOLD = 20;

  let tickCount = 0;
  let surgeActive = false;
  let surgeZone = null;
  let intervalId = null;

  async function tick() {
    tickCount++;
    try {
      const allPois = await POI.find().populate('zone_id').lean();
      const updatedQueues = [];

      for (const poi of allPois) {
        if (poi.status === 'closed') continue;

        const current = await QueueState.findOne({ poi_id: poi._id });
        if (!current) continue;

        let headcount = current.headcount;
        const target = poi.base_capacity * 0.3;
        const drift = (target - headcount) * 0.05;
        const noise = (Math.random() - 0.5) * 8;
        headcount = Math.max(0, Math.round(headcount + drift + noise));

        if (surgeActive && poi.zone_id?._id.toString() === surgeZone) {
          headcount = Math.min(poi.base_capacity * 1.5, headcount + Math.floor(Math.random() * 15 + 10));
        }

        const servers = Math.max(1, Math.ceil(poi.base_capacity / 15));
        const waitMinutes = Math.round((headcount * poi.service_rate) / servers);

        let trend = 'stable';
        if (waitMinutes > current.estimated_wait_minutes + 2) trend = 'rising';
        else if (waitMinutes < current.estimated_wait_minutes - 2) trend = 'falling';

        await QueueState.updateOne(
          { poi_id: poi._id },
          { headcount, estimated_wait_minutes: waitMinutes, trend, updated_at: new Date() }
        );

        updatedQueues.push({
          poi_id: poi._id,
          poi_name: poi.name,
          headcount,
          estimated_wait_minutes: waitMinutes,
          trend,
        });
      }

      io.emit('queue_update', { tick: tickCount, queues: updatedQueues });

      // Update Zone Densities
      const zones = await Zone.find();
      for (const zone of zones) {
        const zonePois = await POI.find({ zone_id: zone._id });
        const poiIds = zonePois.map(p => p._id);
        const qStates = await QueueState.find({ poi_id: { $in: poiIds } });
        const totalHeadcount = qStates.reduce((sum, q) => sum + q.headcount, 0);
        const density = Math.min(1.0, totalHeadcount / (zone.capacity || 1000));
        
        zone.current_density_score = Math.round(density * 100) / 100;
        await zone.save();
      }

      io.emit('density_update', {
        tick: tickCount,
        zones: zones.map(z => ({
          id: z._id,
          current_density_score: z.current_density_score,
          severity: z.current_density_score > 0.8 ? 'critical' : z.current_density_score > 0.5 ? 'warning' : 'normal',
        }))
      });

    } catch (err) {
      console.error('Simulator Error:', err);
    }
  }

  return {
    start() {
      intervalId = setInterval(tick, TICK_INTERVAL_MS);
    },
    stop() {
      clearInterval(intervalId);
    },
    triggerSurge(zoneId) {
      surgeActive = true;
      surgeZone = zoneId;
      setTimeout(() => { surgeActive = false; surgeZone = null; }, 30000);
    }
  };
}
