import React from 'react';
import { CheckCheck } from 'lucide-react';

export default function NotificationPanel({ notifications = [], onMarkAllRead }) {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h4>Notifiche {unreadCount > 0 && `(${unreadCount})`}</h4>
        {unreadCount > 0 && (
          <button className="mark-read-btn" onClick={onMarkAllRead}>
            <CheckCheck size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Segna lette
          </button>
        )}
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 16px' }}>
            Nessuna notifica presente.
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`}>
              <div className="notification-item-title">{n.title}</div>
              <div className="notification-item-msg">{n.message}</div>
              <div className="notification-item-time">
                {new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
