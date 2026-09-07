import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, ArrowLeft } from 'lucide-react';
import NotificationPanel from './NotificationPanel';

export default function Topbar({ 
  title, 
  currentTab,
  onBackToHome,
  onToggleSidebar, 
  members = [], 
  notifications = [], 
  onMarkAllRead 
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef(null);

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const accentClasses = ['accent-1', 'accent-2', 'accent-3', 'accent-4', 'accent-5'];

  return (
    <header className="topbar">
      <div className="topbar-left">
        {currentTab && currentTab !== 'home' ? (
          <button 
            className="topbar-back-btn" 
            onClick={onBackToHome}
            aria-label="Torna alla Home"
            title="Torna alla Home"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <button 
            className="hamburger-btn" 
            onClick={onToggleSidebar}
            aria-label="Apri menu laterale"
          >
            <Menu size={22} />
          </button>
        )}
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="topbar-right">
        {/* Stack degli Avatar dei Coinquilini */}
        <div className="roommates-avatars-stack" title="Coinquilini della casa">
          {members.map((m, idx) => {
            const initial = (m.full_name || 'C').charAt(0).toUpperCase();
            const accentClass = accentClasses[idx % accentClasses.length];
            return (
              <div 
                key={m.id || idx} 
                className={`avatar ${accentClass}`}
                title={m.full_name}
              >
                {initial}
              </div>
            );
          })}
        </div>

        {/* Pulsante Notifiche con Campanella */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button 
            className="notification-bell-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifiche"
          >
            <Bell size={20} />
            {unreadNotificationsCount > 0 && (
              <span className="notification-badge-dot">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationPanel 
              notifications={notifications}
              onMarkAllRead={() => {
                onMarkAllRead();
                setShowNotifications(false);
              }}
            />
          )}
        </div>
      </div>
    </header>
  );
}
