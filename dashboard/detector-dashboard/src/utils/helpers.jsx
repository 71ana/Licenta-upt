export const getSeverityFromProbability = (probability) => {
  if (!probability) return 'LOW';
  if (probability >= 0.9) return 'CRITICAL';
  if (probability >= 0.7) return 'HIGH';
  if (probability >= 0.5) return 'MEDIUM';
  return 'LOW';
};

export const playAlertSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log('Audio alert not available');
  }
};

export const getThreatLevel = (stats) => {
  if (!stats) return { level: 'LOW', color: '#4caf50' };
  
  const recentAttacks = stats.recent_attacks_hour || 0;
  const criticalThreats = stats.severity_distribution?.find(s => s.severity === 'CRITICAL')?.count || 0;
  
  if (criticalThreats > 0 || recentAttacks > 10) {
    return { level: 'CRITICAL', color: '#ff1744' };
  } else if (recentAttacks > 5) {
    return { level: 'HIGH', color: '#ff9800' };
  } else if (recentAttacks > 0) {
    return { level: 'MEDIUM', color: '#ffb300' };
  }
  return { level: 'LOW', color: '#4caf50' };
};

export const createEnhancedThreatAlert = (data) => {
  const alertData = data.alert || data;

  const getServiceInfo = (port) => {
    const commonPorts = {
      80: "HTTP WEB", 443: "HTTPS WEB", 21: "FTP", 22:"SSH",
      25: "SMTP EMAIL", 53: "DNS", 110: "POP3", 143: "IMAP",
      3306: "MySQL DB", 5432: "PostgreSQL DB", 3389: "RDP"
    };
    return commonPorts[port] || `Port ${port}`;
  };

  const severity = alertData.severity || getSeverityFromProbability(alertData.probability);

  let message = `${alertData.attack} attack detected!`;
  
  if (alertData.dst_ip && alertData.dst_port) {
    const destService = getServiceInfo(alertData.dst_port);
    message += `\nTarget: ${destService} (${alertData.dst_ip}:${alertData.dst_port})`;
  }
  
  if (alertData.src_ip && alertData.src_port) {
    message += `\nSource: ${alertData.src_ip}:${alertData.src_port}`;
  }

  if (alertData.probability) {
    message += `\nConfidence: ${(alertData.probability * 100).toFixed(1)}%`;
  }

  return {
    ...alertData,
    message: message,
    timestamp: new Date(data.timestamp)
  };
};

export const sendNotification = (enhancedAlert) => {
  if (Notification.permission === 'granted') {
    const notificationTitle = `${enhancedAlert.severity} Security Alert!`;
    const notification = new Notification(notificationTitle, {
      body: enhancedAlert.message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'security-alert',
      requireInteraction: enhancedAlert.severity === 'CRITICAL'
    });

    if (enhancedAlert.severity !== 'CRITICAL') {
      setTimeout(() => notification.close(), 5000);
    }
  }
};

export const applyFilters = (alertsData, filterOptions) => {
  let filteredAlerts = [...alertsData];
  
  if (filterOptions.attack_type !== 'all') {
    filteredAlerts = filteredAlerts.filter(alert => alert.attack === filterOptions.attack_type);
  }
  
  if (filterOptions.severity !== 'all') {
    filteredAlerts = filteredAlerts.filter(alert => (alert.severity || 'LOW') === filterOptions.severity);
  }
  
  return filteredAlerts.slice(0, filterOptions.limit || 100);
};
