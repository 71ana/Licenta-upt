import { useCallback, useState } from "react";
import "./App.css";
import AlertsTable from "./components/AlertsTable";
import Controls from "./components/Controls";
import FilterControls from "./components/FilterControls";
import Footer from "./components/Footer";
import Header from "./components/Header";
import StatsCards from "./components/StatsCards";
import SystemMessage from "./components/SystemMessage";
import ThreatAlert from "./components/ThreatAlert";
import { useWebSocket } from "./hooks/useWebSockets";
import TrafficCharts from "./traffic_chart";
import {
  applyFilters,
  createEnhancedThreatAlert,
  getThreatLevel,
  playAlertSound,
  sendNotification
} from "./utils/helpers";

function App() {
  const [alerts, setAlerts] = useState([]); //rezultate filtrare
  const [originalAlerts, setOriginalAlerts] = useState([]); //rezultate originale
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [newThreatAlert, setNewThreatAlert] = useState(null); //popup
  const [showSystemMessage, setShowSystemMessage] = useState(null);
  
  //date nefiltrate initial
  const [filterOptions, setFilterOptions] = useState({
    attack_type: 'all',
    severity: 'all',
    limit: 100
  });

  const handleDataUpdate = useCallback((data, isInitial = false) => {
    console.log('Data update received:', data);
    
    const alertsData = data.alerts || [];
    const statsData = data.stats || {};
    
    setOriginalAlerts(alertsData); //salvam datele originale
    
    const filteredAlerts = applyFilters(alertsData, filterOptions); //aplicam filtre
    setAlerts(filteredAlerts);
    
    setStats(statsData);
    setLastUpdate(new Date(data.timestamp));
    
    if (isInitial) {
      setLoading(false);
      setError(null);
    }
  }, [filterOptions]);

  const handleThreatDetected = useCallback((data) => {
    const enhancedAlert = createEnhancedThreatAlert(data);
    setNewThreatAlert(enhancedAlert);
    
    const dismissTime = enhancedAlert.severity === 'CRITICAL' ? 30000 : 20000;
    setTimeout(() => setNewThreatAlert(null), dismissTime);
    
    sendNotification(enhancedAlert);
    
    if (enhancedAlert.severity === 'CRITICAL' || enhancedAlert.severity === 'HIGH') {
      playAlertSound();
    }
  }, []);

  const handleSystemMessage = useCallback((message) => {
    setShowSystemMessage(message);
    setTimeout(() => setShowSystemMessage(null), 5000);
  }, []);

  const { socket, connectionStatus, monitoringActive, systemHealth } = useWebSocket(
    handleDataUpdate,
    handleThreatDetected,
    handleSystemMessage
  );

  const applyFiltersToData = (alertsData, newFilters) => {
    if (newFilters) {
      setFilterOptions(newFilters);
    }
    
    const currentFilters = newFilters || filterOptions;
    const filteredAlerts = applyFilters(alertsData, currentFilters);
    setAlerts(filteredAlerts);
    return filteredAlerts;
  };

  const handleAttackTypeChange = (e) => {
    const newFilters = { ...filterOptions, attack_type: e.target.value };
    applyFiltersToData(originalAlerts, newFilters);
  };

  const handleSeverityChange = (e) => {
    const newFilters = { ...filterOptions, severity: e.target.value };
    applyFiltersToData(originalAlerts, newFilters);
  };

  const handleClearFilters = () => {
    const defaultFilters = {
      attack_type: 'all',
      severity: 'all',
      limit: 100
    };
    applyFiltersToData(originalAlerts, defaultFilters);
  };

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      if (filterOptions.attack_type !== 'all') params.append('attack_type', filterOptions.attack_type);
      if (filterOptions.severity !== 'all') params.append('severity', filterOptions.severity);
      params.append('limit', 1000);
      
      const response = await fetch(`http://localhost:5000/api/export/${format}?${params}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `security_data_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert(error.message || 'Export failed. Please try again.');
    }
  };

  const dismissThreatAlert = () => setNewThreatAlert(null);
  const dismissSystemMessage = () => setShowSystemMessage(null);

  const threatLevel = getThreatLevel(stats);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <h1 className="loading-title">Network Anomaly Detection System</h1>
        <div className="loading-content">
          <div className="loading-message">Initializing security monitoring...</div>
          <div className="loading-status">Status: {connectionStatus}</div>
          <div className="loading-websocket">
            WebSocket: {socket?.connected ? 'Connected' : 'Connecting...'}
          </div>
          {systemHealth.database && (
            <div className="loading-database">Database: Connected</div>
          )}
        </div>
      </div>
    );
  }

  if (error && !alerts.length) {
    return (
      <div className="app-container">
        <Header
          threatLevel={threatLevel}
          connectionStatus={connectionStatus}
          socket={socket}
          lastUpdate={lastUpdate}
        />
        <div className="error-box">
          <p className="error-title">Connection Error: {error}</p>
          <p className="error-message">
            Unable to connect to the monitoring server. This could be due to:
          </p>
          <ul className="error-list">
            <li>Server is not running</li>
            <li>Network connectivity issues</li>
            <li>Database connection issues</li>
          </ul>
          <div className="error-actions">
            <button className="error-button secondary" onClick={() => window.location.reload()}>
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header
        threatLevel={threatLevel}
        connectionStatus={connectionStatus}
        socket={socket}
        lastUpdate={lastUpdate}
      />

      <SystemMessage
        message={showSystemMessage}
        onDismiss={dismissSystemMessage}
      />

      <ThreatAlert
        alert={newThreatAlert}
        onDismiss={dismissThreatAlert}
      />

      <StatsCards
        stats={stats}
        monitoringActive={monitoringActive}
      />

      <TrafficCharts
        alerts={alerts}
        stats={stats}
      />
      
      <Controls
        onExport={handleExport}
        isServerConnected={socket?.connected || false}
        alertsCount={alerts.length}
      />

      <FilterControls
        filterOptions={filterOptions}
        onAttackTypeChange={handleAttackTypeChange}
        onSeverityChange={handleSeverityChange}
        onClearFilters={handleClearFilters}
      />

      <AlertsTable
        alerts={alerts}
        filterOptions={filterOptions}
      />

      <Footer
        lastUpdate={lastUpdate}
        stats={stats}
      />
    </div>
  );
}

export default App;
