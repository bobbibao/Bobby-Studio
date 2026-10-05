import { useEffect } from 'react';
import { isGenerationUpdatedEvent } from '../api/guards';
import type { ConnectionState, RealtimeScheduler } from '../scheduler/types';

/** What the studio needs from the realtime transport; the Socket.IO adapter lives in socketConnection.ts. */
export interface StudioSocket {
  isConnected(): boolean;
  /** True while the transport is still trying to (re)connect. */
  isActive(): boolean;
  reconnect(): void;
  /** Registers handlers and returns the unsubscribe function. */
  subscribe(handlers: { onUpdate(payload: unknown): void; onStateChange(): void }): () => void;
}

export function connectionOf(socket: Pick<StudioSocket, 'isConnected' | 'isActive'>): ConnectionState {
  if (socket.isConnected()) {
    return 'connected';
  }
  return socket.isActive() ? 'reconnecting' : 'offline';
}

/**
 * Feeds `generation.updated` hints and connection state to the scheduler. The server joins this user's
 * room automatically; the event only says "something changed", so the scheduler reads the snapshot over REST.
 */
export function useGenerationEvents(scheduler: RealtimeScheduler | null, connect: () => StudioSocket): void {
  useEffect(() => {
    if (!scheduler) {
      return undefined;
    }
    const socket = connect();
    const report = () => scheduler.setConnection(connectionOf(socket));
    const unsubscribe = socket.subscribe({
      onUpdate: (payload) => {
        if (isGenerationUpdatedEvent(payload)) {
          scheduler.handleHint(payload);
        }
      },
      onStateChange: report,
    });
    const wake = () => {
      if (document.visibilityState !== 'hidden' && !socket.isConnected() && !socket.isActive()) {
        socket.reconnect();
      }
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    report();
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
    };
  }, [scheduler, connect]);
}
