import React from 'react';
import AdminLayout from '../components/AdminLayout';
import { useFetch, useQueues, useZoneDensity } from '../hooks/useRealtime';
import { getDashboardMetrics } from '../lib/api';

export default function AdminAnalyticsLive() {
  const { data: metrics } = useFetch(getDashboardMetrics);
  const { queues } = useQueues();
  const zones = useZoneDensity();

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight">Venue Analytics</h2>
          <p className="text-on-surface-variant text-sm">Aggregated performance and venue utilization metrics.</p>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg Wait', value: `${metrics?.average_wait_minutes || 0}m`, sub: 'Across all stalls', icon: 'timer' },
            { label: 'Peak Wait', value: `${metrics?.worst_queue?.wait || 0}m`, sub: metrics?.worst_queue?.poi_name || 'N/A', icon: 'trending_up' },
            { label: 'Active Tasks', value: metrics?.active_tasks || 0, sub: 'High priority count', icon: 'assignment' },
            { label: 'Volunteers', value: `${metrics?.available_volunteers || 0} online`, sub: 'Ready to dispatch', icon: 'badge' },
          ].map((kpi, idx) => (
            <div key={idx} className="bg-surface/40 backdrop-blur-md p-5 rounded-2xl border border-outline-variant/30 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="material-symbols-outlined text-primary">{kpi.icon}</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">{kpi.label}</span>
              </div>
              <div className="text-3xl font-headline font-black text-on-surface">{kpi.value}</div>
              <div className="text-xs text-on-surface-variant mt-1">{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Zone Density Chart */}
          <div className="bg-surface/40 backdrop-blur-md p-6 rounded-2xl border border-outline-variant/30">
            <h3 className="font-headline font-bold text-lg mb-6">Zone Utilization (%)</h3>
            <div className="space-y-6">
              {zones.map(z => (
                <div key={z.id} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-on-surface">{z.name}</span>
                    <span className={z.severity === 'critical' ? 'text-error' : z.severity === 'warning' ? 'text-tertiary' : 'text-primary'}>
                      {Math.round(z.current_density_score * 100)}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-background/50 rounded-full overflow-hidden border border-outline-variant/10">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out rounded-full ${
                        z.severity === 'critical' ? 'bg-error' : z.severity === 'warning' ? 'bg-tertiary' : 'bg-primary'
                      }`}
                      style={{ width: `${z.current_density_score * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Queue Wait Time Breakdown */}
          <div className="bg-surface/40 backdrop-blur-md p-6 rounded-2xl border border-outline-variant/30">
            <h3 className="font-headline font-bold text-lg mb-6">Line Performance</h3>
            <div className="space-y-4">
              {queues.slice(0, 5).map(q => (
                <div key={q.poi_id} className="flex items-center gap-4">
                  <div className="w-24 text-xs font-bold text-on-surface truncate">{q.poi_name}</div>
                  <div className="flex-1 h-2 bg-background/50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-700 ${
                        q.estimated_wait_minutes >= 15 ? 'bg-error' : q.estimated_wait_minutes >= 8 ? 'bg-tertiary' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min(100, (q.estimated_wait_minutes / 30) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs font-mono text-on-surface-variant w-8 text-right">{q.estimated_wait_minutes}m</div>
                </div>
              ))}
              <div className="pt-4 mt-4 border-t border-outline-variant/20">
                <div className="flex items-center justify-between text-xs font-medium text-on-surface-variant">
                  <span>Total Venue Headcount</span>
                  <span className="text-on-surface font-bold text-base">{metrics?.total_headcount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
