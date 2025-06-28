const SystemMessage = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className={`system-message ${message.type}`}>
      <div className="message-content">
        <span className="message-text">{message.message}</span>
        <span className="message-time">
          {message.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <button
        className="message-dismiss"
        onClick={onDismiss}
      >
        ✕
      </button>
    </div>
  );
};

export default SystemMessage;