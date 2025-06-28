const StatsCards = ({ stats, monitoringActive }) => {
  if (!stats) return null;

  return (
    <div className="stats-container">
      <div className="stat-card attacks">
        <div className="stat-icon">⚔️</div>
        <div className="stat-content">
          <h3 className="stat-title">Total Attacks</h3>
          <p className="stat-value">{stats.total_attacks?.toLocaleString() || 0}</p>
          <p className="stat-subtitle">All time</p>
        </div>
      </div>
      
      <div className="stat-card recent">
        <div className="stat-icon">🕐</div>
        <div className="stat-content">
          <h3 className="stat-title">Recent Attacks</h3>
          <p className="stat-value">{stats.recent_attacks?.toLocaleString() || 0}</p>
          <p className="stat-subtitle">Last 24 hours</p>
        </div>
      </div>
      
      <div className="stat-card hourly">
        <div className="stat-icon">⏰</div>
        <div className="stat-content">
          <h3 className="stat-title">This Hour</h3>
          <p className="stat-value">{stats.recent_attacks_hour?.toLocaleString() || 0}</p>
          <p className="stat-subtitle">Last 60 minutes</p>
        </div>
      </div>

      <div className="stat-card status">
        <div className="stat-icon">🔗</div>
        <div className="stat-content">
          <h3 className="stat-title">Connection</h3>
          <p className="stat-value">
            {monitoringActive ? 'LIVE' : 'OFFLINE'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;