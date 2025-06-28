import { useState } from 'react';
import NotificationControl from './NotificationControl';

const Controls = ({ onExport, isServerConnected = true, alertsCount = 0 }) => {
const [isExporting, setIsExporting] = useState(false);

const handleExport = async (format) => {
  if (alertsCount === 0) {
  alert('No data available to export.');
  return;
}

  setIsExporting(true);
  try {
    await onExport(format);
  } finally {
    setTimeout(() => setIsExporting(false), 1000);
  }
};

const getExportButtonText = (format, isExporting) => {
  if (isExporting) {
    return format === 'csv' ? 'Exporting...' : 'Generating...';
  }
  return `Export ${format.toUpperCase()}`;
};

const getExportButtonClass = (format) => {
  let classes = `control-button export ${isExporting ? 'loading' : ''}`;
  
  if (!isServerConnected) {
    classes += ' degraded';
  }
  
  return classes;
};

return (
    <div className="controls-container">
      <div className="controls-group primary">
        <NotificationControl />
      </div>

      <div className="controls-group secondary">
        <div className="export-section">
          <div className="export-buttons">
            <button
              className={getExportButtonClass('csv')}
              onClick={() => handleExport('csv')}
              disabled={isExporting || alertsCount === 0}
              title={!isServerConnected ? 'Server offline - will export local data' : 'Export filtered data as CSV'}
            >
              <span className="button-icon">📊</span>
              <span className="button-text">
                {getExportButtonText('csv', isExporting)}
              </span>
            </button>

            <button
              className={getExportButtonClass('pdf')}
              onClick={() => handleExport('pdf')}
              disabled={isExporting || alertsCount === 0 || !isServerConnected}
              title={!isServerConnected ? 'PDF export requires server connection' : 'Export filtered data as PDF'}
            >
              <span className="button-icon">📄</span>
              <span className="button-text">
                {getExportButtonText('pdf', isExporting)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;