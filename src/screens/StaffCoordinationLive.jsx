import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { useQueues, useAlerts, useFetch, useTaskUpdates } from '../hooks/useRealtime';
import { getVolunteers, getTasks, createTask, updateTaskStatus, getZones } from '../lib/api';

export default function StaffCoordinationLive() {
  const { queues } = useQueues();
  const { alerts } = useAlerts();
  const latestTaskEvent = useTaskUpdates();
  const { data: volunteers, refetch: refetchVol } = useFetch(getVolunteers);
  const { data: tasks, refetch: refetchTasks } = useFetch(getTasks);
  const { data: zones } = useFetch(getZones);

  const [showDispatch, setShowDispatch] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({ volunteer_id: '', zone_id: '', title: '', description: '', priority: 'medium' });

  // Refetch when task events arrive
  useEffect(() => {
    if (latestTaskEvent) { refetchTasks(); refetchVol(); }
  }, [latestTaskEvent]);

  const handleDispatch = async () => {
    if (!dispatchForm.title || !dispatchForm.volunteer_id) return;
    await createTask(dispatchForm);
    setShowDispatch(false);
    setDispatchForm({ volunteer_id: '', zone_id: '', title: '', description: '', priority: 'medium' });
    refetchTasks();
    refetchVol();
  };

  const handleResolve = async (taskId) => {
    await updateTaskStatus(taskId, 'resolved');
    refetchTasks();
    refetchVol();
  };

  const availableVol = volunteers?.filter(v => v.status === 'available') || [];
  const activeTasks = tasks?.filter(t => t.status !== 'resolved') || [];
  const resolvedTasks = tasks?.filter(t => t.status === 'resolved') || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h2 className="font-headline text-3xl font-bold tracking-tight">Staff Coordination</h2>
            <p className="text-on-surface-variant text-sm">Dispatch volunteers and manage live tasks</p>
          </div>
          <button
            onClick={() => setShowDispatch(true)}
            className="bg-primary text-on-primary px-4 py-2 rounded text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Dispatch Volunteer
          </button>
        </div>

        {/* Dispatch Modal */}
        {showDispatch && (
          <div className="fixed inset-0 bg-scrim/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDispatch(false)}>
            <div className="bg-surface rounded-lg p-6 w-full max-w-md border border-outline-variant/30 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-headline text-xl font-bold mb-4">Dispatch Task</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-on-surface-variant font-label uppercase tracking-widest">Assign Volunteer</label>
                  <select
                    value={dispatchForm.volunteer_id}
                    onChange={e => setDispatchForm(p => ({ ...p, volunteer_id: e.target.value }))}
                    className="w-full mt-1 bg-surface-container border border-outline-variant text-sm text-on-surface px-3 py-2 rounded outline-none focus:border-primary"
                  >
                    <option value="">Select volunteer...</option>
                    {availableVol.map(v => (
                      <option key={v.id} value={v.id}>{v.name} — {v.zone_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant font-label uppercase tracking-widest">Zone</label>
                  <select
                    value={dispatchForm.zone_id}
                    onChange={e => setDispatchForm(p => ({ ...p, zone_id: e.target.value }))}
                    className="w-full mt-1 bg-surface-container border border-outline-variant text-sm text-on-surface px-3 py-2 rounded outline-none focus:border-primary"
                  >
                    <option value="">Select zone...</option>
                    {zones?.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant font-label uppercase tracking-widest">Task Title</label>
                  <input
                    value={dispatchForm.title}
                    onChange={e => setDispatchForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Clear congestion at Gate A"
                    className="w-full mt-1 bg-surface-container border border-outline-variant text-sm text-on-surface px-3 py-2 rounded outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-on-surface-variant font-label uppercase tracking-widest">Priority</label>
                  <div className="flex gap-2 mt-1">
                    {['low', 'medium', 'high', 'critical'].map(p => (
                      <button
                        key={p}
                        onClick={() => setDispatchForm(prev => ({ ...prev, priority: p }))}
                        className={`px-3 py-1 rounded text-xs font-bold capitalize transition-colors ${
                          dispatchForm.priority === p
                            ? p === 'critical' ? 'bg-error text-on-error' : p === 'high' ? 'bg-tertiary text-on-tertiary' : 'bg-primary text-on-primary'
                            : 'bg-surface-container text-on-surface-variant border border-outline-variant/30'
                        }`}
                      >{p}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => setShowDispatch(false)} className="flex-1 bg-surface-container text-on-surface py-2 rounded text-sm font-medium border border-outline-variant/30">Cancel</button>
                <button onClick={handleDispatch} className="flex-1 bg-primary text-on-primary py-2 rounded text-sm font-bold">Dispatch</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Volunteers */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-surface rounded-lg p-5 border border-outline-variant/30 shadow-sm">
              <h3 className="font-body text-base font-semibold mb-3">Volunteers ({volunteers?.length || 0})</h3>
              <div className="flex flex-col gap-2">
                {volunteers?.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded border border-outline-variant/30">
                    <div className={`w-3 h-3 rounded-full ${v.status === 'available' ? 'bg-primary' : v.status === 'busy' ? 'bg-tertiary' : 'bg-outline'}`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{v.name}</p>
                      <p className="text-xs text-on-surface-variant">{v.zone_name}</p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${
                      v.status === 'available' ? 'bg-primary/10 text-primary' : 'bg-tertiary-container/40 text-tertiary'
                    }`}>{v.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Tasks */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-surface rounded-lg p-5 border border-outline-variant/30 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-body text-base font-semibold">Active Tasks ({activeTasks.length})</h3>
              </div>
              <div className="flex flex-col gap-3">
                {activeTasks.length === 0 && <p className="text-center text-on-surface-variant text-sm py-6">No active tasks — all clear ✓</p>}
                {activeTasks.map(t => (
                  <div key={t.id} className={`p-4 rounded-lg border shadow-sm flex items-center justify-between ${
                    t.priority === 'critical' ? 'bg-error-container/20 border-error/30' :
                    t.priority === 'high' ? 'bg-tertiary-container/20 border-tertiary/20' :
                    'bg-surface-container-lowest border-outline-variant/30'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{t.title}</h4>
                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded ${
                          t.priority === 'critical' ? 'bg-error text-on-error' :
                          t.priority === 'high' ? 'bg-tertiary text-on-tertiary' :
                          'bg-surface-container text-on-surface-variant'
                        }`}>{t.priority}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant">{t.volunteer_name || 'Unassigned'} • {t.zone_name || 'No zone'} • {t.status}</p>
                    </div>
                    <button
                      onClick={() => handleResolve(t.id)}
                      className="bg-primary text-on-primary px-3 py-1.5 rounded text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">check</span>
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
