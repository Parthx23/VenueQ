import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const bottomNavItems = [
  { icon: 'home', label: 'Home', path: '/app' },
  { icon: 'stadium', label: 'Map', path: '/app/map' },
  { icon: 'hourglass_empty', label: 'Queues', path: '/app/queues' },
  { icon: 'fastfood', label: 'Services', path: '/app/services' },
  { icon: 'notifications', label: 'Alerts', path: '/app/alerts' },
];

export default function AttendeeLayout({ children }) {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen text-on-surface font-body relative">
      <div className="absolute inset-0 z-0 overflow-hidden mix-blend-screen opacity-30 fixed pointer-events-none">
        <iframe
          className="absolute top-1/2 left-1/2 w-[115vw] h-[115vh] -translate-x-1/2 -translate-y-1/2 object-cover"
          src="https://www.youtube.com/embed/XryIwrqLOXs?autoplay=1&mute=1&controls=0&loop=1&playlist=XryIwrqLOXs&showinfo=0&modestbranding=1&iv_load_policy=3&rel=0&disablekb=1&enablejsapi=1"
          frameBorder="0"
          allow="autoplay; encrypted-media"
        ></iframe>
      </div>

      {/* Top App Bar */}
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-40 flex justify-between items-center px-6 py-4 w-full">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="VenueQ Logo" className="w-8 h-8 object-contain rounded" />
          <span className="text-lg font-extrabold text-on-surface uppercase font-headline tracking-tighter">VenueQ</span>
        </Link>
        <div className="flex gap-4">
          <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-colors text-on-surface-variant">hub</span>
          <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-colors text-on-surface-variant">account_circle</span>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 px-4 md:px-8 pb-24 max-w-2xl mx-auto w-full [&>*]:relative [&>*]:z-10">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-surface/90 backdrop-blur-xl font-label text-[10px] uppercase tracking-widest font-bold fixed bottom-0 w-full z-50 border-t border-outline-variant/30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] flex justify-around items-center px-4 py-3">
        {bottomNavItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded-lg transition-all ${
                active
                  ? 'text-primary bg-primary/10 scale-95'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className={`material-symbols-outlined mb-1 ${active ? 'fill' : ''}`} style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
