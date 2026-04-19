import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useNotifications, useFetch } from '../hooks/useRealtime';
import { sendNotification, getZones } from '../lib/api';

export default function AdminIncidentsLive() {
  const notifications = useNotifications();
  const { data: zones } = useFetch(getZones);
  
  const [form, setForm] = useState({ 
    title: '', 
    message: '', 
    severity: 'info', 
    type: 'announcement',
    zone_id: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.message) return;
    
    await sendNotification(form);
    setForm({ title: '', message: '', severity: 'info', type: 'announcement', zone_id: '' });
  };

  return (
    <AdminLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Dispatch Form */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <h2 className="font-headline text-3xl font-bold tracking-tight">Incident Reporting</h2>
            <p className="text-on-surface-variant text-sm">Broadcast alerts and emergency instructions to attendees.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-surface/50 backdrop-blur-md p-6 rounded-2xl border border-outline-variant/30 space-y-4 shadow-sm">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant ml-1">Update Title</label>
              <input 
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                placeholder="e.g. Critical Congestion Gate A"
                className="w-full bg-background/50 border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant ml-1">Description / Instructions</label>
              <textarea 
                value={form.message}
                onChange={e => setForm({...form, message: e.target.value})}
                placeholder="What should guests do?"
                rows={3}
                className="w-full bg-background/50 border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:border-primary outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant ml-1">Target Zone</label>
                <select 
                  value={form.zone_id}
                  onChange={e => setForm({...form, zone_id: e.target.value})}
                  className="w-full bg-background/50 border border-outline-variant/30 rounded-xl px-3 py-3 text-sm focus:border-primary outline-none"
                >
                  <option value="">All Venue</option>
                  {zones?.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant ml-1">Severity</label>
                <select 
                  value={form.severity}
                  onChange={e => setForm({...form, severity: e.target.value})}
                  className={`w-full bg-background/50 border border-outline-variant/30 rounded-xl px-3 py-3 text-sm outline-none font-bold ${
                    form.severity === 'critical' ? 'text-error' : form.severity === 'warning' ? 'text-tertiary' : 'text-primary'
                  }`}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <button type="submit" className="w-full bg-primary text-on-primary py-4 rounded-xl font-headline font-black text-lg tracking-tight hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">campaign</span>
              Broadcast Alert
            </button>
          </form>
        </div>

        {/* Right: Broadcast History */}
        <div className="lg:col-span-7">
          <h3 className="font-headline font-bold text-xl mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            Broadcast History
          </h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {notifications.map((n, idx) => (
              <div key={n.id || idx} className={`p-4 rounded-xl border border-outline-variant/20 backdrop-blur-md flex gap-4 ${
                n.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' : n.severity === 'warning' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-surface/30'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                   n.severity === 'critical' ? 'bg-red-500/20 text-red-500' : n.severity === 'warning' ? 'bg-orange-500/20 text-orange-500' : 'bg-primary/20 text-primary'
                }`}>
                  <span className="material-symbols-outlined">{n.severity === 'critical' ? 'warning' : 'info'}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-on-surface">{n.title}</h4>
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      {new Date(n.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {n.message}
                  </p>
                  {n.zone_name && (
                    <span className="inline-block mt-2 text-[9px] font-bold uppercase tracking-widest bg-background/50 px-2 py-0.5 rounded text-on-surface-variant">
                      Target: {n.zone_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
