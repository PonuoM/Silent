import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export const useSocket = () => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Connect to socket server
        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
        });

        socketRef.current.on('connect', () => {
            console.log('🔌 Connected to Socket.IO server');
            setIsConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            console.log('❌ Disconnected from Socket.IO server');
            setIsConnected(false);
        });

        socketRef.current.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            setIsConnected(false);
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    return {
        socket: socketRef.current,
        isConnected,
    };
};

export default useSocket;
