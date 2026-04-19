import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useQueues, useZoneDensity, useAlerts, useFetch } from '../hooks/useRealtime';
import { getDashboardMetrics, triggerHalftime, triggerSurge, sendNotification, getZones } from '../lib/api';

export default function AdminDashboardLive() {
  const { queues } = useQueues();
  const zones = useZoneDensity();
  const { alerts, clearAlert } = useAlerts();
  const { data: metrics, refetch: refetchMetrics } = useFetch(getDashboardMetrics);
  const { data: allZones } = useFetch(getZones);
  const [notifText, setNotifText] = useState('');

  const criticalQueues = queues.filter(q => q.estimated_wait_minutes >= 15).sort((a, b) => b.estimated_wait_minutes - a.estimated_wait_minutes);
  const warningQueues = queues.filter(q => q.estimated_wait_minutes >= 8 && q.estimated_wait_minutes < 15);

  const handleHalftime = async () => {
    await triggerHalftime();
    setTimeout(refetchMetrics, 1000);
  };

  const handleSurge = async () => {
    if (allZones?.length) {
      const randomZone = allZones[Math.floor(Math.random() * allZones.length)];
      await triggerSurge(randomZone.id);
    }
  };

  const handleBroadcast = async () => {
    if (!notifText.trim()) return;
    await sendNotification({ title: 'Admin Broadcast', message: notifText, severity: 'info', type: 'announcement' });
    setNotifText('');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="font-headline text-3xl md:text-4xl text-on-surface font-bold tracking-tight mb-1">Operations Dashboard</h2>
            <p className="text-on-surface-variant text-sm flex items-center gap-2">
              Real-time venue intelligence
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleHalftime} className="bg-tertiary text-on-tertiary px-4 py-2 rounded text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">electric_bolt</span>
              Simulate Halftime
            </button>
            <button onClick={handleSurge} className="bg-error text-on-error px-4 py-2 rounded text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">warning</span>
              Trigger Surge
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Avg Wait Time', value: `${metrics.average_wait_minutes}m`, icon: 'schedule', color: 'text-primary' },
              { label: 'Total In Lines', value: metrics.total_headcount, icon: 'groups', color: 'text-on-surface' },
              { label: 'Critical Zones', value: metrics.critical_zones, icon: 'report_problem', color: metrics.critical_zones > 0 ? 'text-error' : 'text-primary' },
              { label: 'Available Staff', value: `${metrics.available_volunteers}/${metrics.available_volunteers + metrics.active_tasks}`, icon: 'badge', color: 'text-secondary' },
            ].map(m => (
              <div key={m.label} className="bg-surface rounded-lg p-5 border border-outline-variant/30 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-label">{m.label}</span>
                  <span className={`material-symbols-outlined text-lg ${m.color}`}>{m.icon}</span>
                </div>
                <span className={`font-headline text-3xl font-bold ${m.color}`}>{m.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Critical Queues */}
          <div className="lg:col-span-4">
            <div className="bg-surface rounded-lg p-5 border border-outline-variant/30 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-body text-base font-semibold">Critical Queues</h3>
                <span className="text-[10px] uppercase tracking-widest text-error bg-error-container/40 px-2 py-1 rounded font-bold">{criticalQueues.length} Active</span>
              </div>
              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                {criticalQueues.map(q => (
                  <div key={q.poi_id} className="bg-surface-container-lowest p-3 rounded flex items-center justify-between border-l-2 border-tertiary border border-outline-variant/50">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-on-surface">{q.poi_name}</span>
                      <span className="text-xs text-on-surface-variant">{q.zone_name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-headline text-lg font-bold text-tertiary">{q.estimated_wait_minutes}m</span>
                      <span className={`text-[10px] flex items-center gap-1 ${q.trend === 'rising' ? 'text-error' : 'text-primary'}`}>
                        <span className="material-symbols-outlined text-xs">{q.trend === 'rising' ? 'trending_up' : q.trend === 'falling' ? 'trending_down' : 'trending_flat'}</span>
                        {q.trend}
                      </span>
                    </div>
                  </div>
                ))}
                {criticalQueues.length === 0 && (
                  <p className="text-center text-on-surface-variant text-sm py-4">No critical queues ✓</p>
                )}
              </div>
            </div>
          </div>

          {/* Zone Density + Alerts */}
          <div className="lg:col-span-8 space-y-6">
            {/* Zone Density Heatmap */}
            <div className="bg-surface rounded-lg p-5 border border-outline-variant/30 shadow-sm">
              <h3 className="font-body text-base font-semibold mb-4">Zone Density</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {zones.map(z => (
                  <div key={z.id} className={`rounded-lg p-4 text-center transition-colors ${
                    z.severity === 'critical' ? 'bg-error-container/40 border border-error/30' :
                    z.severity === 'warning' ? 'bg-tertiary-container/30 border border-tertiary/20' :
                    'bg-surface-container border border-outline-variant/20'
                  }`}>
                    <p className="text-xs text-on-surface-variant font-label uppercase tracking-widest mb-1">{z.name}</p>
                    <p className={`text-2xl font-headline font-bold ${
                      z.severity === 'critical' ? 'text-error' : z.severity === 'warning' ? 'text-tertiary' : 'text-primary'
                    }`}>{Math.round(z.current_density_score * 100)}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Broadcast Notification */}
            <div className="bg-surface rounded-lg p-5 border border-outline-variant/30 shadow-sm">
              <h3 className="font-body text-base font-semibold mb-3">Broadcast to Attendees</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type announcement..."
                  value={notifText}
                  onChange={e => setNotifText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBroadcast()}
                  className="flex-1 bg-surface-container border border-outline-variant text-sm text-on-surface px-3 py-2 rounded focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
                <button onClick={handleBroadcast} className="bg-primary text-on-primary px-4 py-2 rounded text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">send</span>
                  Send
                </button>
              </div>
            </div>

            {/* Live Alerts Feed */}
            <div className="bg-surface rounded-lg p-5 border border-outline-variant/30 shadow-sm">
              <h3 className="font-body text-base font-semibold mb-3">Live Alert Feed</h3>
              <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                {alerts.length === 0 && <p className="text-sm text-on-surface-variant text-center py-4">No active alerts</p>}
                {alerts.map(a => (
                  <div key={a.id} className="flex items-start gap-3 bg-surface-container-lowest p-3 rounded border border-outline-variant/30 text-sm">
                    <span className={`material-symbols-outlined text-lg ${a.type?.includes('critical') || a.type?.includes('halftime') ? 'text-error' : a.type?.includes('surge') ? 'text-tertiary' : 'text-primary'}`}>
                      {a.type?.includes('surge') ? 'warning' : a.type?.includes('halftime') ? 'electric_bolt' : 'notifications'}
                    </span>
                    <div className="flex-1">
                      <p className="text-on-surface">{a.message}</p>
                      <p className="text-[10px] text-on-surface-variant mt-1">{new Date(a.time).toLocaleTimeString()}</p>
                    </div>
                    <button onClick={() => clearAlert(a.id)} className="text-on-surface-variant hover:text-on-surface">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
