import { io } from 'socket.io-client';

// Use the API URL but remove the /api suffix for the base socket connection
const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SOCKET_URL = VITE_API_URL.replace('/api', '');

// Singleton socket instance
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socket.on('connect', () => console.log('[VenueQ] WebSocket connected'));
    socket.on('disconnect', () => console.log('[VenueQ] WebSocket disconnected'));
  }
  return socket;
}
