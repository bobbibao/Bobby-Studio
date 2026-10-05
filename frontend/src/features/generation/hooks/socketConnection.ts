import { connectSocket } from '@/utils/socket';
import type { StudioSocket } from './useGenerationEvents';

export const GENERATION_UPDATED_EVENT = 'generation.updated';

/** Adapter over the shared Socket.IO client (the ID token is attached by the socket utility). */
export function connectStudioSocket(): StudioSocket {
  const url: string = import.meta.env.VITE_API_SOCKET_URL || window.location.origin;
  const socket = connectSocket(url);
  return {
    isConnected: () => socket.connected,
    isActive: () => socket.active,
    reconnect: () => {
      socket.connect();
    },
    subscribe({ onUpdate, onStateChange }) {
      socket.on(GENERATION_UPDATED_EVENT, onUpdate);
      socket.on('connect', onStateChange);
      socket.on('disconnect', onStateChange);
      socket.on('connect_error', onStateChange);
      socket.io.on('reconnect_attempt', onStateChange);
      socket.io.on('reconnect_failed', onStateChange);
      return () => {
        socket.off(GENERATION_UPDATED_EVENT, onUpdate);
        socket.off('connect', onStateChange);
        socket.off('disconnect', onStateChange);
        socket.off('connect_error', onStateChange);
        socket.io.off('reconnect_attempt', onStateChange);
        socket.io.off('reconnect_failed', onStateChange);
      };
    },
  };
}
