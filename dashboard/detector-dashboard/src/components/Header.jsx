const Header = ({
  threatLevel,
  connectionStatus,
  socket,
  lastUpdate
}) => {
  return (
    <div className="app-header">
      <div className="header-left">
        <h1 className="app-title">Network Anomaly Detection System</h1>
        <div className="threat-level-indicator">
          <span className="threat-label">Threat Level:</span>
          <span
            className="threat-level"
            style={{ color: threatLevel.color }}
          >
            {threatLevel.level}
        </span>
        </div>
      </div>

      <div className="header-right">
        <div className="status-panel">
          <div className="connection-status">
            <span className="status-label">Status:</span>
            <span className={`status-value ${socket?.connected ? 'connected' : 'disconnected'}`}>
              {connectionStatus}
            </span>
          </div>
            
          <div className="monitoring-status">
            <span className="status-label">System:</span>
            <span className="status-value active">
              🟢 Live Monitoring
            </span>
          </div>
            
          {lastUpdate && (
            <div className="last-update">
              <span className="status-label">Last Update:</span>
              <span className="status-value">{lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;