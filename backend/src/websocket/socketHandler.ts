import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { isOriginAllowed } from '../config/environment';

let io: SocketIOServer | null = null;

export const initWebSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`[Socket.IO] Client connected: ${socket.id} (transport: ${socket.conn.transport.name})`);

    // Send connection acknowledgement to the connected client
    socket.emit('connection:ack', {
      status: 'connected',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
      message: 'Real-time connection established with Cloud Load Balancer Backend',
    });

    socket.on('disconnect', (reason: string) => {
      logger.info(`[Socket.IO] Client disconnected: ${socket.id} (reason: ${reason})`);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
  });

  logger.info('[Socket.IO] Real-time engine initialized successfully');
  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet. Call initWebSocket first.');
  }
  return io;
};
