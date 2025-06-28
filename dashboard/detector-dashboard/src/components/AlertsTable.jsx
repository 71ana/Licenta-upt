const AlertsTable = ({ alerts, filterOptions }) => {
  if (alerts.length === 0) {
    return (
      <div className="table-section">
        <div className="table-header-section">
          <h2 className="table-title">
            Security Event Log (0 events)
          </h2>
        </div>
        
        <div className="empty-state">
          <div className="empty-icon">📡</div>
          <h3 className="empty-title">No Security Events</h3>
          <p className="empty-message">
            The system is scanning network traffic in real-time.
            Security events will appear here as they are detected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-section">
      <div className="table-header-section">
        <h2 className="table-title">
          Security Event Log ({alerts.length?.toLocaleString() || 0} events)
        </h2>
        <div className="table-info">
          <span>Showing {filterOptions.attack_type !== 'all' ? filterOptions.attack_type : 'all'} events</span>
          {filterOptions.severity !== 'all' && (
            <span> • {filterOptions.severity} severity</span>
          )}
        </div>
      </div>
      
      <div className="table-container">
        <table className="alerts-table">
          <thead className="table-header">
            <tr>
              <th>ID</th>
              <th>Time</th>
              <th>Duration</th>
              <th>Source</th>
              <th>Destination</th>
              <th>Protocol</th>
              <th>FWD</th>
              <th>BWD</th>
              <th>Bytes/sec</th>
              <th>Packets/sec</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Probability</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, index) => (
              <tr
                key={alert.id || index}
                className={`table-row ${alert.is_threat ? 'threat-row' : 'safe-row'} ${alert.severity?.toLowerCase() || ''}`}
              >
                <td className="table-cell id">
                  {alert.id || index + 1}
                </td>
                <td className="table-cell timestamp">
                  {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : "-"}
                </td>
                <td className="table-cell duration">
                  {alert.durata?.toFixed(3) || 0}s
                </td>
                <td className="table-cell ip">
                  {alert.src_ip || "Unknown"}
                  {alert.src_port && `:${alert.src_port}`}
                </td>
                <td className="table-cell ip">
                  {alert.dst_ip || "Unknown"}
                  {alert.dst_port && `:${alert.dst_port}`}
                </td>
                <td className="table-cell protocol">
                  {alert.protocol || "Unknown"}
                </td>
                <td className="table-cell packets">
                  {alert.total_fwd_packets?.toLocaleString() || 0}
                </td>
                <td className="table-cell packets">
                  {alert.total_bwd_packets?.toLocaleString() || 0}
                </td>
                <td className="table-cell bytes">
                  {alert.bytes_per_sec?.toLocaleString() || 0}
                </td>
                <td className="table-cell packets">
                  {alert.packets_per_sec?.toLocaleString() || 0}
                </td>
                <td className={`table-cell attack ${alert.attack === "BENIGN" ? "benign" : "malicious"}`}>
                  <span className="attack-indicator">
                    {alert.attack === "BENIGN" ? "✅" : "🚨"}
                  </span>
                  <span className="attack-text">
                    {alert.attack === "BENIGN" ? "SAFE" : "THREAT"}
                  </span>
                  <div className="attack-type">
                    {alert.attack}
                  </div>
                </td>
                <td className={`table-cell severity ${alert.severity?.toLowerCase() || 'low'}`}>
                  <span className="severity-indicator">
                    {alert.severity === 'CRITICAL' ? '🔴' :
                    alert.severity === 'HIGH' ? '🟠' :
                    alert.severity === 'MEDIUM' ? '🟡' : '🟢'}
                  </span>
                  <span className="severity-text">
                    {alert.severity || 'LOW'}
                  </span>
                </td>
                <td className={`table-cell probability ${
                  alert.probability > 0.8 ? "critical" :
                  alert.probability > 0.6 ? "high" :
                  alert.probability > 0.4 ? "medium" : "low"
                }`}>
                  <div className="probability-container">
                    <span className="probability-text">
                      {((alert.probability || 0) * 100).toFixed(1)}%
                    </span>
                    <div className="probability-bar">
                      <div
                        className="probability-fill"
                        style={{
                          width: `${(alert.probability || 0) * 100}%`,
                          backgroundColor:
                            alert.probability > 0.8 ? '#ff1744' :
                            alert.probability > 0.6 ? '#ff9800' :
                            alert.probability > 0.4 ? '#ffb300' : '#4caf50'
                        }}
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AlertsTable;
