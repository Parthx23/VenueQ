import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AttendeeLayout from '../components/AttendeeLayout';
import { useQueues, useNotifications, useFetch } from '../hooks/useRealtime';
import { getEvents } from '../lib/api';

export default function AttendeeHomeLive() {
  const { queues } = useQueues();
  const notifications = useNotifications();
  const { data: events } = useFetch(getEvents);
  const [countdown, setCountdown] = useState('00:45:12');

  // Fake countdown timer
  useEffect(() => {
    let s = 45 * 60 + 12;
    const t = setInterval(() => {
      s = Math.max(0, s - 1);
      const h = String(Math.floor(s / 3600)).padStart(2, '0');
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const sec = String(s % 60).padStart(2, '0');
      setCountdown(`${h}:${m}:${sec}`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Smart suggestions: fastest food + nearest restroom
  const foodQueues = queues.filter(q => q.poi_type === 'food' || q.poi_type === 'beverage').sort((a, b) => a.estimated_wait_minutes - b.estimated_wait_minutes);
  const restroomQueues = queues.filter(q => q.poi_type === 'restroom').sort((a, b) => a.estimated_wait_minutes - b.estimated_wait_minutes);
  const latestNotif = notifications[0];

  return (
    <AttendeeLayout>
      <div className="space-y-6">
        {/* Live Alert Banner */}
        {latestNotif && (
          <div className="bg-primary-container/40 rounded-lg p-4 flex items-start gap-3 relative overflow-hidden border border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
            <span className="material-symbols-outlined text-primary relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
            <div className="relative z-10">
              <p className="text-sm font-bold text-primary tracking-wide">ALERT</p>
              <p className="text-on-surface font-headline text-lg">{latestNotif.message}</p>
            </div>
          </div>
        )}

        {/* Welcome / Ticket Card */}
        <div className="bg-surface rounded-lg overflow-hidden relative shadow-[0_10px_30px_rgba(0,0,0,0.06)] border border-outline-variant/30">
          <div className="absolute top-0 right-0 p-4">
            <span className="bg-surface-container-high px-3 py-1 rounded text-xs font-bold text-primary tracking-widest font-label uppercase">Stadium App</span>
          </div>
          <div className="p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-headline font-bold text-on-surface mb-1">Welcome, Alex</h2>
            <p className="text-on-surface-variant font-body mb-6">Championship Finals 2024</p>
            <div className="grid grid-cols-3 gap-2 bg-surface-container-lowest p-4 rounded border border-outline-variant/30">
              <div className="text-center">
                <p className="text-xs text-on-surface-variant font-label uppercase tracking-widest mb-1">Gate</p>
                <p className="text-xl font-headline font-bold text-primary">A</p>
              </div>
              <div className="text-center border-l border-r border-outline-variant/30">
                <p className="text-xs text-on-surface-variant font-label uppercase tracking-widest mb-1">Section</p>
                <p className="text-xl font-headline font-bold text-primary">102</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-on-surface-variant font-label uppercase tracking-widest mb-1">Seat</p>
                <p className="text-xl font-headline font-bold text-primary">12</p>
              </div>
            </div>
          </div>
          <div className="bg-primary p-4 flex justify-between items-center">
            <span className="text-on-primary font-bold font-headline">Event starts in</span>
            <span className="text-on-primary font-black font-headline text-2xl tracking-tighter">{countdown}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: 'event_seat', label: 'Find My Seat', to: '/app/map' },
            { icon: 'route', label: 'Shortest Lines', to: '/app/queues' },
            { icon: 'wc', label: 'Nearest Restroom', to: '/app/queues' },
            { icon: 'storefront', label: 'Concessions', to: '/app/services' },
          ].map(a => (
            <Link key={a.label} to={a.to} className="bg-surface hover:bg-surface-container-low p-4 rounded-lg flex flex-col items-center justify-center gap-2 transition-colors group border border-outline-variant/30 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-primary">{a.icon}</span>
              </div>
              <span className="text-sm font-semibold text-on-surface text-center">{a.label}</span>
            </Link>
          ))}
        </div>

        {/* Smart Suggestions — Live from backend */}
        <h3 className="text-lg font-headline font-bold text-on-surface mt-8 mb-4 tracking-tight">Smart Suggestions</h3>
        <div className="flex flex-col gap-3">
          {foodQueues[0] && (
            <div className="bg-surface p-4 rounded-lg flex items-center gap-4 relative overflow-hidden border border-outline-variant/30 shadow-sm">
              <div className="w-1 absolute left-0 top-0 bottom-0 bg-secondary"></div>
              <div className="bg-surface-container p-2 rounded">
                <span className="material-symbols-outlined text-secondary">fastfood</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-on-surface font-semibold">{foodQueues[0].estimated_wait_minutes} min wait at {foodQueues[0].poi_name}</p>
                <p className="text-xs text-on-surface-variant">Fastest option • {foodQueues[0].zone_name}</p>
              </div>
              <Link to="/app/queues" className="text-primary font-bold text-sm">GO</Link>
            </div>
          )}
          {restroomQueues[0] && (
            <div className="bg-surface p-4 rounded-lg flex items-center gap-4 relative overflow-hidden border border-outline-variant/30 shadow-sm">
              <div className="w-1 absolute left-0 top-0 bottom-0 bg-primary"></div>
              <div className="bg-surface-container p-2 rounded">
                <span className="material-symbols-outlined text-primary">wc</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-on-surface font-semibold">{restroomQueues[0].estimated_wait_minutes} min — {restroomQueues[0].poi_name}</p>
                <p className="text-xs text-on-surface-variant">Nearest restroom • {restroomQueues[0].zone_name}</p>
              </div>
              <Link to="/app/queues" className="text-primary font-bold text-sm">GO</Link>
            </div>
          )}
        </div>
      </div>
    </AttendeeLayout>
  );
}
