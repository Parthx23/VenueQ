import React from 'react';
import AdminLayout from '../components/AdminLayout';
import { useQueues } from '../hooks/useRealtime';
import { patchQueueOverride } from '../lib/api';

export default function AdminQueuesLive() {
  const { queues, refetch } = useQueues();

  const handleOverride = async (poi_id, currentWait) => {
    const newVal = prompt(`Override wait time for this location (minutes):`, currentWait);
    if (newVal === null) return;
    const mins = parseInt(newVal);
    if (isNaN(mins)) return;

    try {
      await patchQueueOverride(poi_id, { estimated_wait_minutes: mins });
      // Queue update will come via socket, but refetching is safe
    } catch (err) {
      alert('Failed to override queue time');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight">Queue Management</h2>
          <p className="text-on-surface-variant text-sm">Monitor and override wait times for all venue locations.</p>
        </div>

        <div className="bg-surface/40 backdrop-blur-md rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high/50 text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Zone</th>
                <th className="px-6 py-4 text-center">Wait Time</th>
                <th className="px-6 py-4 text-center">Headcount</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {queues.sort((a,b) => b.estimated_wait_minutes - a.estimated_wait_minutes).map(q => (
                <tr key={q.poi_id} className="hover:bg-surface-container-low/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-on-surface">{q.poi_name}</div>
                  </td>
                  <td className="px-6 py-4 capitalize text-xs text-on-surface-variant">{q.poi_type}</td>
                  <td className="px-6 py-4 text-xs text-on-surface-variant">{q.zone_name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-headline font-black text-lg ${
                      q.estimated_wait_minutes >= 15 ? 'text-error' : q.estimated_wait_minutes >= 8 ? 'text-tertiary' : 'text-primary'
                    }`}>
                      {q.estimated_wait_minutes}m
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium">{q.headcount}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOverride(q.poi_id, q.estimated_wait_minutes)}
                      className="bg-primary/10 text-primary hover:bg-primary hover:text-on-primary px-3 py-1.5 rounded text-xs font-bold transition-all"
                    >
                      Override
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
