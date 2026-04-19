import React, { useState, useEffect } from 'react';
import AttendeeLayout from '../components/AttendeeLayout';
import { getSocket } from '../lib/socket';

export default function AlertsLive() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial notifications
  useEffect(() => {
    fetch('http://localhost:3001/api/notifications')
      .then(res => res.json())
      .then(data => {
        setAlerts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load notifications:', err);
        setLoading(false);
      });
  }, []);

  // Listen for live incoming notifications
  useEffect(() => {
    const socket = getSocket();
    
    // The server emits 'notification' whenever a new alert/announcement is created
    const handleNewNotification = (newNotif) => {
      setAlerts(prev => [newNotif, ...prev]);
    };

    socket.on('notification', handleNewNotification);
    
    // Also handle 'alert' (halftime rush events, etc.)
    const handleAlert = (alertData) => {
      const liveAlert = {
        id: Date.now().toString(),
        title: alertData.type === 'halftime_rush' ? 'Halftime Rush' : 'System Alert',
        message: alertData.message,
        severity: 'critical',
        created_at: new Date().toISOString()
      };
      setAlerts(prev => [liveAlert, ...prev]);
    };
    
    socket.on('alert', handleAlert);

    return () => {
      socket.off('notification', handleNewNotification);
      socket.off('alert', handleAlert);
    };
  }, []);

  return (
    <AttendeeLayout>
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="font-headline font-black text-3xl tracking-tighter text-on-surface mb-2">Live Alerts</h1>
          <p className="text-on-surface-variant text-sm">Important updates and real-time guidance from the venue operations team.</p>
        </div>
        {/* Pulse indicator to show it's live */}
        <div className="flex items-center gap-1.5 bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold shrink-0 mb-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          LIVE
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-on-surface-variant py-10 animate-pulse">
            Loading organizers updates...
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center text-on-surface-variant py-10 bg-surface/40 backdrop-blur-sm border border-outline-variant/20 rounded-2xl">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">notifications_paused</span>
            <p className="font-medium">All quiet! No recent updates.</p>
          </div>
        ) : (
          alerts.map((alert, idx) => {
            const isCritical = alert.severity === 'critical';
            const isWarning = alert.severity === 'warning';
            
            let bgClass = "bg-surface/50 border-outline-variant/30";
            let iconColor = "text-primary bg-primary/20";
            let iconText = "campaign";
            
            if (isCritical) {
              bgClass = "bg-red-900/30 border-red-500/50 backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.15)]";
              iconColor = "text-red-400 bg-red-500/20";
              iconText = "warning";
            } else if (isWarning) {
              bgClass = "bg-orange-900/30 border-orange-500/50 backdrop-blur-md";
              iconColor = "text-orange-400 bg-orange-500/20";
              iconText = "error_outline";
            } else {
              bgClass = "bg-surface/60 border-outline-variant/30 backdrop-blur-md hover:border-primary/50";
            }

            return (
              <div key={alert.id || idx} className={`border rounded-2xl p-5 transition-all flex gap-4 items-start ${bgClass}`}>
                <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center ${iconColor}`}>
                  <span className="material-symbols-outlined">{iconText}</span>
                </div>
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-1">
                    <h3 className={`font-headline font-bold text-lg ${isCritical ? 'text-red-100' : isWarning ? 'text-orange-100' : 'text-on-surface'}`}>
                      {alert.title}
                    </h3>
                    <span className="text-[10px] text-on-surface-variant/70 font-mono font-medium">
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    {alert.message}
                  </p>
                  
                  {alert.zone_name && (
                    <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider bg-black/40 px-2 py-1 rounded text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px]">my_location</span>
                      {alert.zone_name}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div className="h-6"></div>
    </AttendeeLayout>
  );
}
