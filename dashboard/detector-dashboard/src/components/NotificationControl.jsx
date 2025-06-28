import { useEffect, useState } from 'react';

const NotificationControl = () => {
  const [notificationStatus, setNotificationStatus] = useState('checking');

  useEffect(() => {
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = () => {
    if (!('Notification' in window)) {
      setNotificationStatus('not_supported');
      return;
    }

    switch (Notification.permission) {
      case 'granted':
        setNotificationStatus('enabled');
        break;
      case 'denied':
        setNotificationStatus('blocked');
        break;
      case 'default':
        setNotificationStatus('pending');
        break;
      default:
        setNotificationStatus('unknown');
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      
      switch (permission) {
        case 'granted':
          setNotificationStatus('enabled');
          try {
            new Notification('Security Alerts Enabled!', {
              body: 'You will now receive real-time security notifications',
              icon: '/favicon.ico',
              tag: 'permission-granted'
            });
          } catch (notifError) {
            console.error('Error sending test notification:', notifError);
          }
          break;
        case 'denied':
          setNotificationStatus('blocked');
          break;
        default:
          setNotificationStatus('pending');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setNotificationStatus('error');
    }
  };

  const showNotificationGuide = () => {
    const userAgent = navigator.userAgent;
    let instructions = '';
    
    if (userAgent.includes('Chrome')) {
      instructions = 'Click the lock icon in the address bar → Notifications → Allow';
    } else if (userAgent.includes('Firefox')) {
      instructions = 'Click the shield icon in the address bar → Permissions → Notifications → Allow';
    } else if (userAgent.includes('Safari')) {
      instructions = 'Safari menu → Preferences → Websites → Notifications → Allow';
    } else {
      instructions = 'Check your browser settings to enable notifications for this site';
    }
    
    alert(`To enable notifications manually:\n\n${instructions}\n\nThen refresh the page.`);
  };

  const getNotificationButton = () => {
    switch (notificationStatus) {
      case 'pending':
        return (
          <button
            className="control-button notifications primary"
            onClick={requestNotificationPermission}
          >
            Enable Security Alerts
          </button>
        );
      
      case 'blocked':
        return (
          <div className="notification-controls">
            <button
              className="control-button notifications blocked"
              onClick={showNotificationGuide}
            >
              Enable in Browser
            </button>
            <span className="notification-status error">Notifications Blocked</span>
          </div>
        );
      
      case 'enabled':
        return (
          <div className="notification-controls">
            <span className="notification-status success">
              Security Alerts Enabled
            </span>
          </div>
        );
      
      case 'not_supported':
        return (
          <div className="notification-controls">
            <span className="notification-status error">
              Notifications not supported
            </span>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="notification-control-wrapper">
      {getNotificationButton()}
    </div>
  );
};

export default NotificationControl;