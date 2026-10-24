import { useState, useEffect } from 'react';
import { getSocket } from '../services/socket';
import { SocketConnectionAck } from '../types/server.types';

export interface UseSocketReturn {
  isConnected: boolean;
  socketId: string | null;
  transportName: string | null;
  lastAck: SocketConnectionAck | null;
  error: string | null;
}

export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [transportName, setTransportName] = useState<string | null>(null);
  const [lastAck, setLastAck] = useState<SocketConnectionAck | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      setIsConnected(true);
      setSocketId(socket.id || null);
      setTransportName(socket.io.engine?.transport?.name || 'websocket');
      setError(null);
    };

    const handleDisconnect = (reason: string) => {
      setIsConnected(false);
      setSocketId(null);
      setTransportName(null);
      setError(`Disconnected: ${reason}`);
    };

    const handleConnectError = (err: Error) => {
      setIsConnected(false);
      setError(err.message);
    };

    const handleAck = (data: SocketConnectionAck) => {
      setLastAck(data);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('connection:ack', handleAck);

    if (!socket.connected) {
      socket.connect();
    } else {
      setIsConnected(true);
      setSocketId(socket.id || null);
      setTransportName(socket.io.engine?.transport?.name || 'websocket');
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('connection:ack', handleAck);
    };
  }, []);

  return {
    isConnected,
    socketId,
    transportName,
    lastAck,
    error,
  };
};
