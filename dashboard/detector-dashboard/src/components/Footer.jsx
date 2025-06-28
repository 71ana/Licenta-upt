const Footer = ({ lastUpdate, stats }) => {
  return (
    <div className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <span className="footer-label">System:</span>
          <span>Network Anomaly Detection</span>
        </div>
        <div className="footer-section">
          <span className="footer-label">Last Scan:</span>
          <span>{lastUpdate?.toLocaleString() || 'Never'}</span>
        </div>
        {stats?.uptime && (
          <div className="footer-section">
            <span className="footer-label">Uptime:</span>
            <span>{stats.uptime}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Footer;