import React from 'react';
import AdminLayout from '../components/AdminLayout';
import VenueMapLive from './VenueMapLive';

export default function AdminMapLive() {
  // We can wrap the same VenueMap but perhaps add admin-specific tools later.
  // For now, it makes the Map link working with the high-fidelity stadium layout.
  return (
    <AdminLayout>
       <div className="h-full flex flex-col">
         <div className="mb-4">
            <h2 className="font-headline text-3xl font-bold tracking-tight">Geospatial Operations</h2>
            <p className="text-on-surface-variant text-sm">Real-time tracking of staff, crowd surges, and facility status.</p>
         </div>
         <div className="flex-1 min-h-0 bg-surface/20 rounded-2xl overflow-hidden border border-outline-variant/30 shadow-2xl">
            {/* Reuse the high-fidelity map component */}
            <VenueMapLive isAdminView={true} />
         </div>
       </div>
    </AdminLayout>
  );
}
