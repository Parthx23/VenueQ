// ============================================================
// VenueFlow AI — Crowd Simulation Engine
// Maps to Section 11 (System Workflow) & Section 12 (AI Layer)
//
// Uses Little's Law approximation:
//   Wait Time = Headcount * (ServiceRate / NumServers)
//
// Also models event-triggered surges (halftime rush, end-of-game)
// ============================================================
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createSimulator(db, io) {
  // ── Configuration ───────────────────────────────────────
  const TICK_INTERVAL_MS = 3000;           // Update every 3 seconds
  const SURGE_PROBABILITY = 0.02;          // 2% chance of a random surge per tick
  const CRITICAL_WAIT_THRESHOLD = 20;      // Minutes — triggers auto-alert
  const WARNING_WAIT_THRESHOLD = 12;

  // Track simulation state
  let tickCount = 0;
  let surgeActive = false;
  let surgeZone = null;
  let intervalId = null;

  // ── Core Tick Function ──────────────────────────────────
  function tick() {
    tickCount++;
    const allPois = db.prepare(`
      SELECT p.id, p.name, p.type, p.service_rate, p.base_capacity, p.status,
             z.name as zone_name, z.id as zone_id, z.capacity as zone_capacity
      FROM pois p
      JOIN zones z ON p.zone_id = z.id
      WHERE p.type IN ('food','beverage','restroom','merch','exit')
    `).all();

    const updatedQueues = [];

    for (const poi of allPois) {
      if (poi.status === 'closed' || poi.service_rate === 0) continue;

      // Get current state
      const current = db.prepare(`SELECT * FROM queue_states WHERE poi_id = ?`).get(poi.id);
      if (!current) continue;

      let headcount = current.headcount;

      // ── Simulate crowd dynamics ─────────────────────────
      // Base drift: random walk with mean-reversion to ~30% capacity
      const target = poi.base_capacity * 0.3;
      const drift = (target - headcount) * 0.05;         //  pull toward target
      const noise = (Math.random() - 0.5) * 8;           //  random noise ±4
      headcount = Math.max(0, Math.round(headcount + drift + noise));

      // Surge effect: if a surge is active in this zone, spike headcount
      if (surgeActive && poi.zone_id === surgeZone) {
        headcount = Math.min(poi.base_capacity * 1.5, headcount + Math.floor(Math.random() * 15 + 10));
      }

      // Time-of-event effects (simulate halftime patterns using tick cycles)
      if (tickCount % 100 >= 40 && tickCount % 100 <= 55) {
        // Halftime rush: food/beverage/restroom usage spikes
        if (['food', 'beverage', 'restroom'].includes(poi.type)) {
          headcount = Math.min(poi.base_capacity * 1.8, headcount + Math.floor(Math.random() * 12));
        }
      }

      headcount = Math.max(0, Math.round(headcount));

      // ── Little's Law: Wait = headcount × (serviceRate / servers) ─
      const servers = Math.max(1, Math.ceil(poi.base_capacity / 15)); // Assume 1 server per 15 capacity
      const waitMinutes = Math.round((headcount * poi.service_rate) / servers);

      // Determine trend
      let trend = 'stable';
      if (waitMinutes > current.estimated_wait_minutes + 2) trend = 'rising';
      else if (waitMinutes < current.estimated_wait_minutes - 2) trend = 'falling';

      // Update DB
      db.prepare(`
        UPDATE queue_states 
        SET headcount = ?, estimated_wait_minutes = ?, trend = ?, updated_at = datetime('now')
        WHERE poi_id = ?
      `).run(headcount, waitMinutes, trend, poi.id);

      // Update zone density score
      const zoneHeadcount = db.prepare(`
        SELECT SUM(qs.headcount) as total
        FROM queue_states qs
        JOIN pois p ON qs.poi_id = p.id
        WHERE p.zone_id = ?
      `).get(poi.zone_id);

      const zoneDensity = Math.min(1.0, (zoneHeadcount?.total || 0) / poi.zone_capacity);
      db.prepare(`UPDATE zones SET current_density_score = ? WHERE id = ?`)
        .run(Math.round(zoneDensity * 100) / 100, poi.zone_id);

      updatedQueues.push({
        poi_id: poi.id,
        poi_name: poi.name,
        poi_type: poi.type,
        zone_name: poi.zone_name,
        zone_id: poi.zone_id,
        headcount,
        estimated_wait_minutes: waitMinutes,
        trend,
        status: poi.status,
      });

      // ── Auto-alert on critical thresholds ───────────────
      if (waitMinutes >= CRITICAL_WAIT_THRESHOLD && current.estimated_wait_minutes < CRITICAL_WAIT_THRESHOLD) {
        const alertPayload = {
          type: 'critical_queue',
          poi_id: poi.id,
          poi_name: poi.name,
          zone_name: poi.zone_name,
          wait_minutes: waitMinutes,
          message: `CRITICAL: ${poi.name} queue has reached ${waitMinutes} min wait`,
        };
        io.emit('alert', alertPayload);
      }
    }

    // Broadcast updated queue data to all connected clients
    io.emit('queue_update', {
      tick: tickCount,
      timestamp: new Date().toISOString(),
      queues: updatedQueues,
    });

    // Broadcast zone density data
    const zones = db.prepare(`SELECT id, name, current_density_score, capacity FROM zones`).all();
    io.emit('density_update', {
      tick: tickCount,
      zones: zones.map(z => ({
        ...z,
        severity: z.current_density_score > 0.8 ? 'critical' : z.current_density_score > 0.5 ? 'warning' : 'normal',
      })),
    });

    // Random surge trigger
    if (!surgeActive && Math.random() < SURGE_PROBABILITY) {
      const randomZone = zones[Math.floor(Math.random() * zones.length)];
      surgeActive = true;
      surgeZone = randomZone.id;
      io.emit('alert', {
        type: 'surge_detected',
        zone_name: randomZone.name,
        message: `Crowd surge detected in ${randomZone.name}`,
      });
      // Surge lasts 10 ticks (~30 seconds)
      setTimeout(() => {
        surgeActive = false;
        surgeZone = null;
        io.emit('alert', {
          type: 'surge_resolved',
          zone_name: randomZone.name,
          message: `Surge in ${randomZone.name} has subsided`,
        });
      }, TICK_INTERVAL_MS * 10);
    }
  }

  // ── Public API ──────────────────────────────────────────
  return {
    start() {
      console.log(`  ⚡ Simulator running (tick every ${TICK_INTERVAL_MS / 1000}s)`);
      intervalId = setInterval(tick, TICK_INTERVAL_MS);
    },
    stop() {
      if (intervalId) clearInterval(intervalId);
    },
    // Manual surge trigger for demo purposes
    triggerSurge(zoneId) {
      surgeActive = true;
      surgeZone = zoneId;
      setTimeout(() => { surgeActive = false; surgeZone = null; }, TICK_INTERVAL_MS * 15);
    },
    getTickCount() { return tickCount; },
  };
}
