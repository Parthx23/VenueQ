import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, ImageOverlay, Marker, Popup, Polyline, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AttendeeLayout from '../components/AttendeeLayout';
import { useQueues, useZoneDensity } from '../hooks/useRealtime';
import { getPOIs, getZones } from '../lib/api';

// ── Map bounds (pixel-based CRS for indoor map) ─────────
const MAP_BOUNDS = [[0, 0], [900, 1200]];
const MAP_CENTER = [450, 600];

// ── POI positions on the stadium map (pixel x,y) ────────
// These are hand-mapped to the SVG layout
const POI_POSITIONS = {
  'Burger Haven':       [115, 400],
  'Craft Beer Station': [115, 750],
  'Pizza Corner':       [800, 350],
  'Taco Stand':         [800, 550],
  'Smoothie Bar':       [450, 1050],
  'Hot Dog Express':    [450, 150],
  'Concession Block C': [55, 600],
  'Restrooms North A':  [130, 550],
  'Restrooms South B':  [785, 700],
  'Restrooms East':     [450, 1000],
  'Restrooms Sector 4': [450, 200],
  'Official Merch Store':[70, 500],
  'Merch Stand West':   [430, 100],
  'Main Stage':         [450, 600],
  'VIP Lounge Stage':   [355, 870],
  'First Aid Station':  [60, 700],
  'Info Kiosk':         [45, 400],
  'Gate A North':       [65, 600],
  'Gate B South':       [850, 600],
};

// ── Zone Centers (for Heatmap) ──────────────────────────
const ZONE_METADATA = {
  'North Concourse':    { center: [120, 600], radius: 150 },
  'South Concourse':    { center: [780, 600], radius: 150 },
  'West Wing':          { center: [450, 150], radius: 180 },
  'East Wing':          { center: [450, 1050], radius: 180 },
  'VIP Deck':           { center: [355, 870], radius: 120 },
  'Field Access A':     { center: [450, 450], radius: 100 },
  'Field Access B':     { center: [450, 750], radius: 100 },
};

// User's fixed location (Section 102, near north-east seating)
const USER_LOCATION = [250, 760];

// ── Pathfinding: Simple A* style waypoint routing ───────
// We define corridor waypoints for realistic indoor routing
const CORRIDOR_WAYPOINTS = [
  [120, 600],  // North concourse center
  [120, 400],  // North concourse west
  [120, 800],  // North concourse east
  [250, 200],  // West wing north
  [450, 150],  // West wing center
  [650, 200],  // West wing south
  [250, 1000], // East wing north
  [450, 1050], // East wing center
  [650, 1000], // East wing south
  [780, 400],  // South concourse west
  [780, 600],  // South concourse center
  [780, 800],  // South concourse east
  [55, 600],   // Main gate plaza
  [450, 600],  // Center (field edge)
  [250, 600],  // Mid north
  [650, 600],  // Mid south
];

function findNearestWaypoint(point) {
  let minDist = Infinity;
  let nearest = CORRIDOR_WAYPOINTS[0];
  for (const wp of CORRIDOR_WAYPOINTS) {
    const d = Math.hypot(wp[0] - point[0], wp[1] - point[1]);
    if (d < minDist) { minDist = d; nearest = wp; }
  }
  return nearest;
}

function buildRoute(from, to) {
  // Simple routing: from → nearest waypoint → corridor path → nearest waypoint to dest → dest
  const wpStart = findNearestWaypoint(from);
  const wpEnd = findNearestWaypoint(to);
  
  if (wpStart === wpEnd) return [from, wpStart, to];
  
  // Find a corridor path between waypoints (BFS-like through connected waypoints)
  // For simplicity, we just go: from → wpStart → wpEnd → to
  // Add an intermediate point if they're far apart for a more natural path
  const midY = (wpStart[0] + wpEnd[0]) / 2;
  const midX = (wpStart[1] + wpEnd[1]) / 2;
  
  // Check if we need to go around (not through the field)
  const goesThruField = midY > 300 && midY < 600 && midX > 310 && midX < 890;
  
  if (goesThruField) {
    // Route around the field via the concourse
    const topRoute = [from, wpStart, [120, wpStart[1]], [120, wpEnd[1]], wpEnd, to];
    const bottomRoute = [from, wpStart, [780, wpStart[1]], [780, wpEnd[1]], wpEnd, to];
    // Pick shorter route
    const topLen = topRoute.reduce((sum, p, i) => i === 0 ? 0 : sum + Math.hypot(p[0] - topRoute[i-1][0], p[1] - topRoute[i-1][1]), 0);
    const botLen = bottomRoute.reduce((sum, p, i) => i === 0 ? 0 : sum + Math.hypot(p[0] - bottomRoute[i-1][0], p[1] - bottomRoute[i-1][1]), 0);
    return topLen < botLen ? topRoute : bottomRoute;
  }
  
  return [from, wpStart, [midY, midX], wpEnd, to];
}

// ── Wait time color logic ───────────────────────────────
function waitColor(mins) {
  if (mins <= 5) return '#01696f';     // Primary (green-teal)
  if (mins <= 15) return '#8d4d27';    // Tertiary (orange)
  return '#ba1a1a';                     // Error (red)
}

function waitBgColor(mins) {
  if (mins <= 5) return '#9af0f7';
  if (mins <= 15) return '#ffdbc7';
  return '#ffdad6';
}

// ── Custom icon creator ─────────────────────────────────
function createPOIIcon(waitMins, type) {
  const color = waitColor(waitMins);
  const bg = waitBgColor(waitMins);
  const iconMap = { food: '🍔', beverage: '🍺', restroom: '🚻', merch: '🛍️', exit: '🚪', stage: '🎵', medical: '🏥', info: 'ℹ️' };
  const emoji = iconMap[type] || '📍';
  
  return L.divIcon({
    className: 'custom-poi-marker',
    html: `
      <div style="
        display:flex; align-items:center; justify-content:center; flex-direction:column;
        cursor:pointer; position:relative;
      ">
        <div style="
          background:${bg}; border:2px solid ${color}; border-radius:12px;
          padding:4px 8px; display:flex; align-items:center; gap:4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15); transition: transform 0.2s;
          font-family: Inter, sans-serif;
        ">
          <span style="font-size:14px">${emoji}</span>
          <span style="font-size:11px; font-weight:700; color:${color}">${waitMins}m</span>
        </div>
        <div style="
          width:2px; height:8px; background:${color}; margin-top:-1px;
        "></div>
        <div style="
          width:6px; height:6px; background:${color}; border-radius:50%;
          margin-top:-1px;
        "></div>
      </div>
    `,
    iconSize: [60, 45],
    iconAnchor: [30, 45],
    popupAnchor: [0, -45],
  });
}

// ── User location icon ──────────────────────────────────
const userIcon = L.divIcon({
  className: 'user-marker',
  html: `
    <div style="position:relative; width:24px; height:24px;">
      <div style="
        position:absolute; inset:-8px; background:rgba(1,105,111,0.15); border-radius:50%;
        animation: pulse-ring 2s ease-out infinite;
      "></div>
      <div style="
        width:24px; height:24px; background:#01696f; border:3px solid #fff;
        border-radius:50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position:relative; z-index:2;
      "></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// ── Map Resize Handler ──────────────────────────────────
function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
  }, [map]);
  return null;
}

// ═══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function VenueMapLive({ isAdminView = false }) {
  const { queues } = useQueues();
  const zones = useZoneDensity();
  const [allPois, setAllPois] = useState([]);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  // Fetch POIs on mount
  useEffect(() => {
    getPOIs().then(setAllPois).catch(console.error);
  }, []);

  // Merge live queue data into POIs
  const mergedPois = useMemo(() => {
    return allPois.map(poi => {
      const liveQ = queues.find(q => q.poi_id === poi.id);
      return {
        ...poi,
        estimated_wait_minutes: liveQ?.estimated_wait_minutes ?? poi.estimated_wait_minutes ?? 0,
        headcount: liveQ?.headcount ?? poi.headcount ?? 0,
        trend: liveQ?.trend ?? poi.trend ?? 'stable',
      };
    });
  }, [allPois, queues]);

  // Handle POI click → build route
  const handlePoiClick = (poi) => {
    const poiPos = POI_POSITIONS[poi.name];
    if (!poiPos) return;
    
    const routePath = buildRoute(USER_LOCATION, poiPos);
    setSelectedPoi(poi);
    setRoute(routePath);
    
    // Calculate walking time (assume 80px = 1 minute walk)
    const totalDist = routePath.reduce((sum, p, i) => 
      i === 0 ? 0 : sum + Math.hypot(p[0] - routePath[i-1][0], p[1] - routePath[i-1][1]), 0
    );
    const walkMins = Math.max(1, Math.round(totalDist / 80));
    setRouteInfo({ walkMins, distance: `${Math.round(totalDist / 5)}m` });
  };

  const clearRoute = () => {
    setSelectedPoi(null);
    setRoute(null);
    setRouteInfo(null);
  };

  const MapContent = (
    <>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .leaflet-container { background: #e8e7e3 !important; border-radius: 8px; }
        .custom-poi-marker { background: none !important; border: none !important; }
        .user-marker { background: none !important; border: none !important; }
        .leaflet-popup-content-wrapper { border-radius: 8px !important; box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important; }
        .leaflet-popup-tip { display: none; }
        .density-tooltip { background: transparent !important; border: none !important; box-shadow: none !important; pointer-events: none; }
        .density-tooltip::before { display: none; }
      `}</style>

      <div className="space-y-4">
        {!isAdminView && (
          <div>
            <h2 className="text-2xl font-headline font-bold tracking-tight">Venue Map</h2>
            <p className="text-on-surface-variant text-sm flex items-center gap-2">
              Tap any location to see route & wait time
            </p>
          </div>
        )}

        {/* Route Info Panel */}
        {selectedPoi && routeInfo && (
          <div className="bg-surface rounded-lg p-4 border border-primary/30 shadow-md flex items-center gap-4 relative overflow-hidden">
            <div className="w-1 absolute left-0 top-0 bottom-0 bg-primary"></div>
            <div className="bg-primary/10 p-2 rounded-lg">
              <span className="material-symbols-outlined text-primary text-2xl">directions_walk</span>
            </div>
            <div className="flex-1">
              <h4 className="font-headline font-bold text-on-surface">{selectedPoi.name}</h4>
              <p className="text-xs text-on-surface-variant">{selectedPoi.zone_name} • {selectedPoi.description}</p>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm font-bold text-primary">{routeInfo.walkMins} min walk</span>
                <span className="text-sm text-on-surface-variant">•</span>
                <span className={`text-sm font-bold ${selectedPoi.estimated_wait_minutes <= 5 ? 'text-primary' : selectedPoi.estimated_wait_minutes <= 15 ? 'text-tertiary' : 'text-error'}`}>
                  {selectedPoi.estimated_wait_minutes}m wait
                </span>
                <span className="text-sm text-on-surface-variant">•</span>
                <span className="text-sm text-on-surface-variant">{selectedPoi.headcount} in line</span>
              </div>
            </div>
            <button onClick={clearRoute} className="bg-surface-container-high p-2 rounded-lg hover:bg-surface-container-highest transition-colors">
              <span className="material-symbols-outlined text-on-surface-variant">close</span>
            </button>
          </div>
        )}

        {/* Map Container */}
        <div className="rounded-lg overflow-hidden border border-outline-variant/30 shadow-sm" style={{ height: '60vh', minHeight: '400px' }}>
          <MapContainer
            center={MAP_CENTER}
            zoom={0}
            minZoom={-1}
            maxZoom={2}
            crs={L.CRS.Simple}
            style={{ height: '100%', width: '100%' }}
            maxBounds={[[-100, -100], [1000, 1300]]}
            maxBoundsViscosity={1.0}
          >
            <MapInvalidator />

            {/* Stadium floor plan */}
            <ImageOverlay
              url="/stadium-map.svg"
              bounds={MAP_BOUNDS}
            />

            {/* Heatmap Layer */}
            {zones.map(z => {
              const meta = ZONE_METADATA[z.name];
              if (!meta) return null;
              
              const color = z.severity === 'critical' ? '#ba1a1a' : z.severity === 'warning' ? '#8d4d27' : '#01696f';
              const opacity = Math.max(0.1, z.current_density_score * 0.5);
              
              return (
                <CircleMarker
                  key={`heat-${z.id}`}
                  center={meta.center}
                  radius={meta.radius}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: opacity,
                    color: color,
                    weight: 2,
                    opacity: opacity * 0.5,
                  }}
                >
                  <Tooltip permanent direction="center" className="density-tooltip">
                    <span style={{ color: '#fff', fontSize: '10px', fontWeight: 'bold', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                      {Math.round(z.current_density_score * 100)}%
                    </span>
                  </Tooltip>
                </CircleMarker>
              );
            })}

            {/* User location marker */}
            <Marker position={USER_LOCATION} icon={userIcon}>
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
                  <strong style={{ color: '#01696f' }}>You are here</strong><br/>
                  <span style={{ fontSize: '12px', color: '#6f797a' }}>Section 102 • Seat 12</span>
                </div>
              </Popup>
            </Marker>

            {/* POI markers */}
            {mergedPois.map(poi => {
              const pos = POI_POSITIONS[poi.name];
              if (!pos) return null;
              const icon = createPOIIcon(poi.estimated_wait_minutes, poi.type);

              return (
                <Marker
                  key={poi.id}
                  position={pos}
                  icon={icon}
                  eventHandlers={{ click: () => handlePoiClick(poi) }}
                >
                  <Tooltip direction="top" offset={[0, -50]} opacity={0.95}>
                    <div style={{ fontFamily: 'Inter, sans-serif', padding: '2px' }}>
                      <strong>{poi.name}</strong><br/>
                      <span style={{ fontSize: '11px', color: '#6f797a' }}>{poi.zone_name}</span><br/>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: waitColor(poi.estimated_wait_minutes) }}>
                        {poi.estimated_wait_minutes}m wait • {poi.headcount} in line
                      </span>
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}

            {/* Route polyline */}
            {route && (
              <>
                {/* Shadow line */}
                <Polyline
                  positions={route}
                  pathOptions={{
                    color: '#004f54',
                    weight: 6,
                    opacity: 0.3,
                    dashArray: null,
                  }}
                />
                {/* Main route line */}
                <Polyline
                  positions={route}
                  pathOptions={{
                    color: '#01696f',
                    weight: 4,
                    opacity: 0.9,
                    dashArray: '10, 6',
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
                {/* Route endpoint circle */}
                {route.length > 0 && (
                  <CircleMarker
                    center={route[route.length - 1]}
                    radius={8}
                    pathOptions={{ color: '#01696f', fillColor: '#9af0f7', fillOpacity: 1, weight: 2 }}
                  />
                )}
              </>
            )}
          </MapContainer>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex gap-2 flex-wrap">
          {['All', 'Food', 'Restrooms', 'Merch', 'Exits'].map(label => (
            <button key={label} className="bg-surface border border-outline-variant/30 text-on-surface-variant px-3 py-1.5 rounded-full text-xs font-medium hover:bg-surface-container-high transition-colors">
              {label}
            </button>
          ))}
        </div>

        {/* Nearby POIs List */}
        <div className="space-y-2 mt-2">
          <h3 className="text-sm font-label uppercase tracking-widest text-on-surface-variant">Nearby Locations</h3>
          {mergedPois
            .filter(p => POI_POSITIONS[p.name] && p.type !== 'stage' && p.type !== 'info' && p.type !== 'medical')
            .sort((a, b) => a.estimated_wait_minutes - b.estimated_wait_minutes)
            .slice(0, 6)
            .map(poi => (
              <button
                key={poi.id}
                onClick={() => handlePoiClick(poi)}
                className={`w-full bg-surface rounded-lg p-3 flex items-center gap-3 border transition-all text-left ${
                  selectedPoi?.id === poi.id ? 'border-primary/50 bg-primary/5' : 'border-outline-variant/30 hover:bg-surface-container-low'
                }`}
              >
                <div className={`w-3 h-3 rounded-full flex-shrink-0`} style={{ backgroundColor: waitColor(poi.estimated_wait_minutes) }}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{poi.name}</p>
                  <p className="text-xs text-on-surface-variant">{poi.zone_name}</p>
                </div>
                <span className="font-headline font-bold text-sm" style={{ color: waitColor(poi.estimated_wait_minutes) }}>
                  {poi.estimated_wait_minutes}m
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-lg">chevron_right</span>
              </button>
            ))}
        </div>
      </div>
    </>
  );

  return isAdminView ? MapContent : <AttendeeLayout>{MapContent}</AttendeeLayout>;
}
