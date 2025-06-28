const ThreatAlert = ({ alert, onDismiss }) => {
  if (!alert) return null;

  return (
    <div className={`threat-alert ${alert.severity?.toLowerCase() || 'medium'}`}>
      <div className="threat-content">
        <div className="threat-icon">
          {alert.severity === 'CRITICAL' ? '🚨' :
          alert.severity === 'HIGH' ? '⚠️' : '🔔'}
        </div>
        <div className="threat-details">
          <div className="threat-title">
            {alert.severity || 'MEDIUM'} SECURITY ALERT!
          </div>
          <p className="threat-message">{alert.message}</p>
          <div className="threat-metadata">
            <span>Type: {alert.attack_type || 'Unknown'}</span>
            {alert.alert?.probability && (
              <span>Confidence: {(alert.alert.probability * 100).toFixed(1)}%</span>
            )}
            <span>Time: {alert.timestamp.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
      <button className="threat-dismiss" onClick={onDismiss}>
        ✕
      </button>
    </div>
  );
};

export default ThreatAlert;