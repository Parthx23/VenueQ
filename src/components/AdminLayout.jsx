import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const sideNavItems = [
  { icon: 'dashboard', label: 'Overview', path: '/admin' },
  { icon: 'group', label: 'Crowd Flow', path: '/admin/crowd' },
  { icon: 'hourglass_empty', label: 'Queues', path: '/admin/queues' },
  { icon: 'badge', label: 'Staff Coordination', path: '/admin/staff' },
  { icon: 'report_problem', label: 'Incidents', path: '/admin/incidents' },
  { icon: 'map', label: 'Venue Map', path: '/admin/map' },
  { icon: 'analytics', label: 'Analytics', path: '/admin/analytics' },
];

export default function AdminLayout({ children }) {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden text-on-surface font-body relative">
      <div className="absolute inset-0 z-0 overflow-hidden mix-blend-screen opacity-30">
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
          <source src="/Untitled design.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Side Nav */}
      <nav className="relative z-10 hidden md:flex flex-col py-6 px-4 gap-2 bg-surface/60 backdrop-blur-xl w-64 border-r border-outline-variant/30 flex-shrink-0">
        <div className="mb-8 px-2 flex items-center gap-3">
          <img src="/logo.png" alt="VenueQ Logo" className="w-8 h-8 object-contain rounded" />
          <div>
            <Link to="/">
              <h1 className="font-headline font-bold text-xl text-primary tracking-tighter">VenueQ</h1>
            </Link>
            <p className="font-body text-xs text-on-surface-variant font-medium uppercase tracking-widest mt-0.5">Mission Control</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {sideNavItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  active
                    ? 'bg-surface-container-high text-primary font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
                }`}
              >
                <span className={`material-symbols-outlined text-lg ${active ? 'fill' : ''}`}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
        <Link to="/" className="mt-auto w-full bg-gradient-to-r from-primary to-primary/80 text-on-primary font-medium text-sm py-2 px-4 rounded text-center block transition-transform active:scale-95">
          ← Back to Hub
        </Link>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 [&>*]:relative [&>*]:z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
