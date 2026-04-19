import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../lib/socket';

// ── useQueues: Live queue data via WebSocket ────────────────
export function useQueues() {
  const [queues, setQueues] = useState([]);
  const [lastTick, setLastTick] = useState(null);

  useEffect(() => {
    const socket = getSocket();

    socket.on('initial_state', (data) => {
      setQueues(data.queues);
    });

    socket.on('queue_update', (data) => {
      setQueues(data.queues);
      setLastTick(data.timestamp);
    });

    return () => {
      socket.off('initial_state');
      socket.off('queue_update');
    };
  }, []);

  return { queues, lastTick };
}

// ── useZoneDensity: Live zone density data ──────────────────
export function useZoneDensity() {
  const [zones, setZones] = useState([]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('density_update', (data) => {
      setZones(data.zones);
    });

    return () => { socket.off('density_update'); };
  }, []);

  return zones;
}

// ── useAlerts: Live alert stream ────────────────────────────
export function useAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('alert', (alert) => {
      setAlerts(prev => [{ ...alert, id: Date.now(), time: new Date().toISOString() }, ...prev].slice(0, 50));
    });

    return () => { socket.off('alert'); };
  }, []);

  const clearAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return { alerts, clearAlert };
}

// ── useNotifications: Live push notifications ───────────────
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 30));
    });

    return () => { socket.off('notification'); };
  }, []);

  return notifications;
}

// ── useTaskUpdates: Live volunteer task events ──────────────
export function useTaskUpdates() {
  const [latestTask, setLatestTask] = useState(null);

  useEffect(() => {
    const socket = getSocket();

    socket.on('task_created', (task) => setLatestTask({ ...task, _event: 'created' }));
    socket.on('task_updated', (task) => setLatestTask({ ...task, _event: 'updated' }));
    socket.on('volunteer_dispatched', (data) => setLatestTask({ ...data, _event: 'dispatched' }));

    return () => {
      socket.off('task_created');
      socket.off('task_updated');
      socket.off('volunteer_dispatched');
    };
  }, []);

  return latestTask;
}

// ── useFetch: Generic REST fetch hook ───────────────────────
export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchFn()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, deps);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}
