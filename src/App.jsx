import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// Live screens (wired to backend)
import AttendeeHomeLive from './screens/AttendeeHomeLive';
import QueueExplorerLive from './screens/QueueExplorerLive';
import AdminDashboardLive from './screens/AdminDashboardLive';
import StaffCoordinationLive from './screens/StaffCoordinationLive';
import VenueMapLive from './screens/VenueMapLive';
import ServicesLive from './screens/ServicesLive';
import AlertsLive from './screens/AlertsLive';
import AdminQueuesLive from './screens/AdminQueuesLive';
import AdminIncidentsLive from './screens/AdminIncidentsLive';
import AdminAnalyticsLive from './screens/AdminAnalyticsLive';
import AdminCrowdLive from './screens/AdminCrowdLive';
import AdminMapLive from './screens/AdminMapLive';

// Original Stitch screens (static prototypes)
// Removed per user request

import LandingScreen from './components/LandingScreen';

// Hub / Landing
function Hub() {
  const liveRoutes = [
    { name: 'Attendee App',        path: '/app',          icon: 'phone_android', desc: 'Mobile attendee experience', live: true },
    { name: 'Admin Dashboard',     path: '/admin',        icon: 'dashboard',     desc: 'Ops command center', live: true },
  ];

  return (
    <div className="relative h-screen w-full overflow-hidden font-body text-on-surface bg-background">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      {/* Immersive Dashboard Background Video */}
      <div className="absolute inset-0 z-0 overflow-hidden before:absolute before:inset-0 before:bg-background/80 before:z-10">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
        >
          <source src="/Untitled design.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="relative z-10 h-full w-full overflow-y-auto p-6 md:p-12 no-scrollbar">
        <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-3">
            <img src="/logo.png" alt="VenueQ Logo" className="w-16 h-16 md:w-20 md:h-20 object-contain rounded-xl shadow-sm" />
            <h1 className="text-5xl md:text-6xl font-headline font-black tracking-tighter text-primary">VenueQ</h1>
          </div>
          <p className="text-on-surface-variant text-lg max-w-xl mx-auto">Smart Stadium Operations Platform — Real-time crowd intelligence, queue management, and staff coordination.</p>
        </div>

        {/* Live Screens */}
        <h2 className="font-headline text-xl font-bold text-on-surface mb-4 tracking-tight">
          <span className="material-symbols-outlined text-primary align-middle mr-1">sensors</span>
          Live Screens
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {liveRoutes.map(r => (
            <Link
              key={r.path}
              to={r.path}
              className="bg-surface/50 backdrop-blur-md border border-primary/20 rounded-lg p-6 flex items-start gap-4 hover:bg-surface-container-low/60 hover:border-primary/50 transition-all shadow-sm group hover:shadow-[0_10px_30px_rgba(1,105,111,0.2)]"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                <span className="material-symbols-outlined text-primary text-2xl">{r.icon}</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-headline font-bold text-on-surface text-lg">{r.name}</span>
                </div>
                <p className="text-sm text-on-surface-variant">{r.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  </div>
  );
}

export default function App() {
  const [entered, setEntered] = useState(false);

  if (!entered) {
    return <LandingScreen onEnter={() => setEntered(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Hub */}
        <Route path="/" element={<Hub />} />

        {/* Live attendee routes */}
        <Route path="/app" element={<AttendeeHomeLive />} />
        <Route path="/app/queues" element={<QueueExplorerLive />} />
        <Route path="/app/map" element={<VenueMapLive />} />
        <Route path="/app/services" element={<ServicesLive />} />
        <Route path="/app/alerts" element={<AlertsLive />} />

        {/* Live admin routes */}
        <Route path="/admin" element={<AdminDashboardLive />} />
        <Route path="/admin/crowd" element={<AdminCrowdLive />} />
        <Route path="/admin/queues" element={<AdminQueuesLive />} />
        <Route path="/admin/staff" element={<StaffCoordinationLive />} />
        <Route path="/admin/incidents" element={<AdminIncidentsLive />} />
        <Route path="/admin/map" element={<AdminMapLive />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsLive />} />
      </Routes>
    </BrowserRouter>
  );
}
