import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

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
