import React from 'react';
import AttendeeLayout from '../components/AttendeeLayout';

export default function ServicesLive() {
  const services = [
    {
      title: 'Medical Emergency',
      type: 'On Call',
      contact: '+1-800-VENUE-MED',
      description: 'Immediate medical assistance and first aid. Available 24/7 during events.',
      icon: 'medical_services',
      color: 'bg-red-500/20 text-red-400'
    },
    {
      title: 'Security Assistance',
      type: 'On Call & Text',
      contact: 'Text "HELP" to 55444',
      description: 'Report suspicious activity or request security personnel to your section instantly.',
      icon: 'local_ पुलिस', // using 'security' is better
      icon: 'security',
      color: 'bg-blue-500/20 text-blue-400'
    },
    {
      title: 'VIP Concierge',
      type: 'Website',
      contact: 'venueq.com/vip',
      description: 'Request exclusive upgrades, private escorts, or special accommodations.',
      icon: 'star',
      color: 'bg-yellow-500/20 text-yellow-400'
    },
    {
      title: 'Lost & Found',
      type: 'On Call & physical',
      contact: 'Gate 4 Kiosk | Ext. 505',
      description: 'Recover lost items or hand in found belongings to the venue staff.',
      icon: 'support_agent',
      color: 'bg-primary/20 text-primary'
    },
    {
      title: 'In-Seat Food Delivery',
      type: 'Website / App',
      contact: 'Available in "Food" tab',
      description: 'Order hot food and cold beverages directly to your seat without missing the action.',
      icon: 'fastfood',
      color: 'bg-orange-500/20 text-orange-400'
    },
    {
      title: 'Accessibility Transport',
      type: 'On Call',
      contact: 'Call: +1-800-VENUE-ACC',
      description: 'Request a golf-cart transport from the parking lot to your designated gate.',
      icon: 'accessible',
      color: 'bg-green-500/20 text-green-400'
    }
  ];

  return (
    <AttendeeLayout>
      <div className="mb-6">
        <h1 className="font-headline font-black text-3xl tracking-tighter text-on-surface mb-2">Guest Services</h1>
        <p className="text-on-surface-variant text-sm">Access on-demand support and venue facilities instantly.</p>
      </div>

      <div className="space-y-4">
        {services.map((svc, idx) => (
          <div key={idx} className="bg-surface/60 backdrop-blur-md border border-outline-variant/30 rounded-2xl p-5 hover:border-primary/50 transition-colors shadow-sm">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${svc.color}`}>
                <span className="material-symbols-outlined text-2xl">{svc.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-headline font-bold text-lg text-on-surface">{svc.title}</h3>
                  <span className="text-[10px] uppercase tracking-widest font-bold bg-surface-container-high text-on-surface-variant px-2 py-1 rounded">
                    {svc.type}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant mb-3 leading-relaxed">
                  {svc.description}
                </p>
                
                <div className="flex items-center gap-2 bg-background/50 p-2.5 rounded-lg border border-outline-variant/20">
                  <span className="material-symbols-outlined text-sm text-primary">contact_support</span>
                  <span className="font-mono text-sm font-bold text-primary tracking-tight">
                    {svc.contact}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Spacer for bottom nav */}
      <div className="h-6"></div>
    </AttendeeLayout>
  );
}
