import React from 'react';
import AdminLayout from '../components/AdminLayout';
import { useZoneDensity, useQueues, useFetch } from '../hooks/useRealtime';
import { getZones } from '../lib/api';

export default function AdminCrowdLive() {
  const zones = useZoneDensity();
  const { queues } = useQueues();
  const { data: allZones } = useFetch(getZones);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight">Crowd Flow Control</h2>
          <p className="text-on-surface-variant text-sm">Detailed zone-by-zone density analysis and stall performance.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {zones.map(z => {
            const zoneStalls = queues.filter(q => q.zone_name === z.name);
            const avgWait = zoneStalls.length > 0 
                ? (zoneStalls.reduce((acc, q) => acc + q.estimated_wait_minutes, 0) / zoneStalls.length).toFixed(1)
                : 0;

            return (
              <div key={z.id} className="bg-surface/40 backdrop-blur-md rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm flex flex-col">
                <div className={`p-4 border-b border-outline-variant/20 flex justify-between items-center ${
                    z.severity === 'critical' ? 'bg-error/10' : z.severity === 'warning' ? 'bg-tertiary/10' : 'bg-primary/10'
                }`}>
                  <h3 className="font-headline font-bold text-lg">{z.name}</h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                      z.severity === 'critical' ? 'bg-error text-on-error' : z.severity === 'warning' ? 'bg-tertiary text-on-tertiary' : 'bg-primary text-on-primary'
                  }`}>
                    {z.severity}
                  </span>
                </div>
                
                <div className="p-5 space-y-5 flex-1">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Density Score</p>
                      <div className={`text-4xl font-headline font-black ${
                          z.severity === 'critical' ? 'text-error' : 'text-on-surface'
                      }`}>
                        {Math.round(z.current_density_score * 100)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Line Health</p>
                      <div className="text-xl font-bold text-primary">{avgWait}m <span className="text-xs font-medium text-on-surface-variant">avg</span></div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                     <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Stalls in Zone</p>
                     <div className="space-y-1">
                       {zoneStalls.map(s => (
                         <div key={s.poi_id} className="flex justify-between items-center text-xs bg-background/30 p-2 rounded border border-outline-variant/10">
                            <span className="text-on-surface truncate pr-2">{s.poi_name}</span>
                            <span className={`font-bold ${s.estimated_wait_minutes >= 15 ? 'text-error' : 'text-primary'}`}>{s.estimated_wait_minutes}m</span>
                         </div>
                       ))}
                     </div>
                  </div>
                </div>
                
                <div className="p-4 bg-surface-container-low/20 border-t border-outline-variant/20 flex gap-2">
                  <button className="flex-1 text-[10px] font-bold uppercase tracking-widest py-2 rounded bg-surface/50 border border-outline-variant/30 hover:border-primary transition-all">Relocate Staff</button>
                  <button className="flex-1 text-[10px] font-bold uppercase tracking-widest py-2 rounded bg-surface/50 border border-outline-variant/30 hover:border-primary transition-all">Broadcast Zone</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
