import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export const useWebSocket = (onDataUpdate, onThreatDetected, onSystemMessage) => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [systemHealth, setSystemHealth] = useState({
    api_server: false,
    database: false,
    packet_capture: false
  });

  useEffect(() => {

    console.log('Establishing WebSocket connection...');
    
    const newSocket = io('http://localhost:5000', {
      transports: ['polling', 'websocket'],
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('WebSocket connected successfully');
      setConnectionStatus('Connected (Live)');
      setMonitoringActive(true);
      setSystemHealth(prev => ({ ...prev, api_server: true }));
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setConnectionStatus('Disconnected');
      setMonitoringActive(false);
      setSystemHealth(prev => ({ ...prev, api_server: false }));
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('Connection Error');
      setMonitoringActive(false);
      setSystemHealth(prev => ({ ...prev, api_server: false }));
    });

    newSocket.on('initial_data', (data) => {
      console.log('Initial data received via WebSocket');
      onDataUpdate(data, true);
      
      setSystemHealth(prev => ({
        ...prev,
        api_server: true,
        database: data.stats?.total_events !== undefined
      }));
    });

    newSocket.on('data_update', (data) => {
      console.log('Data updated via WebSocket');
      onDataUpdate(data, false);
      
      setConnectionStatus('Updated (Live)');
      setTimeout(() => setConnectionStatus('Connected (Live)'), 2000);

      if (data.new_count && data.new_count > 0) {
        onSystemMessage({
          type: 'info',
          message: `${data.new_count} new events detected`,
          timestamp: new Date()
        });
      }
    });

    newSocket.on('new_threat', (data) => {
      console.log('New threat detected via WebSocket:', data);
      onThreatDetected(data);
    });
    
    newSocket.on('system_message', (data) => {
      console.log('System message:', data);
      onSystemMessage({
        ...data,
        timestamp: new Date(data.timestamp)
      });
    });

    return () => {
      console.log('Cleaning up WebSocket connection');
      newSocket.close();
    };
  }, [onDataUpdate, onThreatDetected, onSystemMessage]);

  return {
    socket,
    connectionStatus,
    monitoringActive,
    systemHealth
  };
};
