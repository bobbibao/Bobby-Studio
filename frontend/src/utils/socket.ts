import { io, Socket } from 'socket.io-client';

interface SocketManager {
  socket: Socket | null;
  joinedRooms: Set<string>;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  onConnectionError?: (error: Error) => void;
}

const socketManager: SocketManager = {
  socket: null,
  joinedRooms: new Set(),
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
};

export const connectSocket = (url: string, onConnectionError?: (error: Error) => void): Socket => {
  if (onConnectionError) {
    socketManager.onConnectionError = onConnectionError;
  }

  if (!socketManager.socket || socketManager.socket.disconnected) {
    socketManager.socket = io(url, {
      transports: ['websocket', 'polling'], // Add polling as fallback
      timeout: 10000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: socketManager.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      upgrade: true,
      rememberUpgrade: true,
      withCredentials: true, // Important for CORS with credentials
    });

    // Handle connection events
    socketManager.socket.on('connect', () => {
      console.log('Socket connected successfully');
      socketManager.reconnectAttempts = 0;

      // Rejoin all rooms that were previously joined
      socketManager.joinedRooms.forEach((room) => {
        console.log(`Rejoining room: ${room}`);
        socketManager.socket?.emit('joinRoom', room);
      });
    });

    socketManager.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);

      // Notify if disconnected unexpectedly
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.warn('Socket disconnected unexpectedly. Will attempt to reconnect...');
      }
    });

    socketManager.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      socketManager.reconnectAttempts++;

      // Notify application of connection errors
      if (socketManager.onConnectionError) {
        socketManager.onConnectionError(error as Error);
      }
    });

    socketManager.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
    });

    socketManager.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after maximum attempts');

      // Notify application that reconnection failed
      if (socketManager.onConnectionError) {
        socketManager.onConnectionError(new Error('Socket reconnection failed after maximum attempts'));
      }
    });

    socketManager.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  return socketManager.socket;
};

export const getSocket = (): Socket => {
  if (!socketManager.socket) {
    throw new Error('Socket not initialized. Call connectSocket first.');
  }
  return socketManager.socket;
};

export const joinJobRoom = (jobId: string): void => {
  if (socketManager.joinedRooms.has(jobId)) {
    return;
  }

  const socket = getSocket();
  if (socket.connected) {
    console.log(`Joining job room: ${jobId}`);
    socket.emit('joinRoom', jobId);
    socketManager.joinedRooms.add(jobId);
  } else {
    console.warn('Socket not connected. Room will be joined on reconnect.');
    socketManager.joinedRooms.add(jobId);
  }
};

export const leaveJobRoom = (jobId: string): void => {
  const socket = getSocket();
  if (socket.connected) {
    console.log(`Leaving job room: ${jobId}`);
    socket.emit('leaveRoom', jobId);
  }
  socketManager.joinedRooms.delete(jobId);
};

export const joinMultipleJobRooms = (jobIds: string[]): void => {
  jobIds.forEach((jobId) => {
    joinJobRoom(jobId);
  });
};

export const leaveAllJobRooms = (): void => {
  const socket = getSocket();
  socketManager.joinedRooms.forEach((room) => {
    if (socket.connected) {
      socket.emit('leaveRoom', room);
    }
  });
  socketManager.joinedRooms.clear();
};

export const isSocketConnected = (): boolean => {
  return socketManager.socket?.connected ?? false;
};

export const getJoinedRooms = (): string[] => {
  return Array.from(socketManager.joinedRooms);
};

export const disconnectSocket = (): void => {
  if (socketManager.socket) {
    console.log('Disconnecting socket...');
    socketManager.socket.disconnect();
    socketManager.socket = null;
    socketManager.joinedRooms.clear();
    socketManager.reconnectAttempts = 0;
  }
};

