import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/config/api';

let socket: Socket | null = null;

export const initializeSocket = (hospitalId: string) => {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket?.id);
      socket?.emit('join-hospital', hospitalId);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const onRequestRemoved = (callback: (data: { request_id: string; reason: string }) => void) => {
  if (socket) {
    socket.on('request-removed', callback);
  }
};

export const offRequestRemoved = () => {
  if (socket) {
    socket.off('request-removed');
  }
};
