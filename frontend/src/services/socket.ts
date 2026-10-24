import { io, Socket } from 'socket.io-client';
import { env } from '../utils/env';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(env.wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  } else if (!socket.connected) {
    socket.connect();
  }
  return socket;
};
