const FilterControls = ({
  filterOptions,
  onAttackTypeChange,
  onSeverityChange,
  onClearFilters
}) => {
  return (
    <div className="filter-controls">
      <div className="filter-group">
        <label>Attack Type:</label>
        <select
          value={filterOptions.attack_type}
          onChange={onAttackTypeChange}
        >
          <option value="all">All Types</option>
          <option value="BENIGN">Safe Events</option>
          <option value="DDOS">DDoS Attacks</option>
          <option value="DOS">DoS</option>
          <option value="PORTSCAN">Port Scans</option>
          <option value="BRUTE FORCE">Brute Force</option>
          <option value="PASSWORD">Password</option>
          <option value="DOS HULK">DoS Hulk</option>
          <option value="RECONNAISANCE">Reconnaisance</option>
          <option value="BOT">Bot</option>
          <option value="INJECTION">Injection</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Severity:</label>
        <select
          value={filterOptions.severity}
          onChange={onSeverityChange}
        >
          <option value="all">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <div className="filter-group">
        <label>&nbsp;</label>
        <button
          className="clear-filters-button"
          onClick={onClearFilters}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default FilterControls;