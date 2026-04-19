import React, { useState } from 'react';
import AttendeeLayout from '../components/AttendeeLayout';
import { useQueues } from '../hooks/useRealtime';

function waitColor(mins) {
  if (mins <= 5) return 'text-primary';
  if (mins <= 15) return 'text-tertiary';
  return 'text-error';
}

function waitBg(mins) {
  if (mins <= 5) return 'border-l-primary';
  if (mins <= 15) return 'border-l-tertiary';
  return 'border-l-error';
}

function trendIcon(trend) {
  if (trend === 'rising') return 'trending_up';
  if (trend === 'falling') return 'trending_down';
  return 'trending_flat';
}

function typeIcon(type) {
  const map = { food: 'restaurant', beverage: 'sports_bar', restroom: 'wc', merch: 'storefront', exit: 'door_front', stage: 'stadium', medical: 'local_hospital', info: 'info' };
  return map[type] || 'place';
}

export default function QueueExplorerLive() {
  const { queues, lastTick } = useQueues();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = queues
    .filter(q => filter === 'all' || q.poi_type === filter)
    .filter(q => q.poi_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.estimated_wait_minutes - a.estimated_wait_minutes);

  const categories = ['all', 'food', 'beverage', 'restroom', 'merch', 'exit'];

  return (
    <AttendeeLayout>
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-headline font-bold text-on-surface tracking-tight">Queue Explorer</h2>
          <p className="text-on-surface-variant text-sm flex items-center gap-2">
            Real-time wait times across all zones
            <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            <span className="text-xs text-primary font-medium">LIVE</span>
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize border ${
                filter === cat
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-surface text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
              }`}
            >
              {cat === 'all' ? 'All Zones' : cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
          <input
            type="text"
            placeholder="Search facilities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface border border-outline-variant/30 text-sm text-on-surface pl-10 pr-3 py-2.5 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
          />
        </div>

        {/* Queue Cards */}
        <div className="flex flex-col gap-3">
          {filtered.map(q => (
            <div key={q.poi_id} className={`bg-surface rounded-lg p-4 border border-outline-variant/30 shadow-sm border-l-4 ${waitBg(q.estimated_wait_minutes)} relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full -mr-6 -mt-6 blur-xl"></div>
              <div className="flex justify-between items-start mb-2 relative z-10">
                <div>
                  <h4 className="font-body text-base font-semibold text-on-surface">{q.poi_name}</h4>
                  <span className="text-xs text-on-surface-variant">{q.zone_name}</span>
                </div>
                <div className="bg-surface-container p-1.5 rounded-full">
                  <span className="material-symbols-outlined text-primary text-lg">{typeIcon(q.poi_type)}</span>
                </div>
              </div>

              <div className="flex items-end gap-6 relative z-10">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-0.5 font-label">Current Wait</span>
                  <span className={`font-headline text-2xl font-bold ${waitColor(q.estimated_wait_minutes)}`}>{q.estimated_wait_minutes}m</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-on-surface-variant mb-0.5 font-label">In Line</span>
                  <span className="font-headline text-lg font-bold text-on-surface">{q.headcount}</span>
                </div>
                <div className="ml-auto">
                  <span className={`text-xs flex items-center gap-1 ${q.trend === 'rising' ? 'text-tertiary' : q.trend === 'falling' ? 'text-primary' : 'text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-sm">{trendIcon(q.trend)}</span>
                    {q.trend}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block">search_off</span>
              No facilities match your filters.
            </div>
          )}
        </div>
      </div>
    </AttendeeLayout>
  );
}
