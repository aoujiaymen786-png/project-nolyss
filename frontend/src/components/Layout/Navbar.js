import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Bell, LogOut } from 'lucide-react';
import { AuthContext } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import API from '../../utils/api';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data } = await API.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (e) {
      console.error('Chargement notifications:', e);
    }
  };

  useEffect(() => {
    if (user) fetchNotifications();
    else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleNotificationClick = async (n) => {
    if (n.link) {
      setNotificationsOpen(false);
      navigate(n.link);
    }
    if (n._id && !n.read) {
      try {
        await API.patch(`/notifications/${n._id}/read`);
        setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (e) {
        console.error('Marquer notification lue:', e);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.patch('/notifications/read-all');
      const { data } = await API.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(0);
    } catch (e) {
      console.error('Tout marquer comme lu:', e);
    }
  };

  return (
    <nav className="app-navbar" aria-label="Navigation principale">
      <Link to="/" className="logo-link">
        <img src="/logo-black.png" alt="Nolyss" className="navbar-logo" />
      </Link>
      <div className="navbar-user-info">
        <button
          type="button"
          onClick={toggleTheme}
          className="navbar-icon-btn theme-toggle"
          aria-label={isDark ? 'Passer au thème clair' : 'Passer au thème sombre'}
          title={isDark ? 'Thème clair' : 'Thème sombre'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        {user ? (
          <>
            <Link to="/profile" className="navbar-profile-link">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="Profil" className="navbar-avatar" />
              ) : (
                <span className="navbar-avatar-fallback">{(user.name || 'U').charAt(0).toUpperCase()}</span>
              )}
              <span className="navbar-user-name">Bonjour, {user.name}</span>
            </Link>
            <div className="navbar-actions-group">
              <div className="navbar-notification-wrap" ref={notifRef}>
                <button
                  type="button"
                  className="navbar-icon-btn navbar-notification-btn"
                  onClick={() => setNotificationsOpen((o) => !o)}
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="navbar-notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="navbar-notification-dropdown">
                    <div className="navbar-notification-header">
                      <h4>Notifications</h4>
                      {unreadCount > 0 && (
                        <button type="button" className="navbar-notification-mark-all" onClick={handleMarkAllRead}>
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>
                    <div className="navbar-notification-list">
                      {notifications.length > 0 ? (
                        notifications.slice(0, 8).map((n) => (
                          <div
                            key={n._id}
                            role="button"
                            tabIndex={0}
                            className={`navbar-notification-item ${n.read ? '' : 'navbar-notification-item-unread'}`}
                            onClick={() => handleNotificationClick(n)}
                            onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(n)}
                          >
                            <span className="navbar-notification-title">{n.title || 'Notification'}</span>
                            {n.message && <span className="navbar-notification-message">{n.message}</span>}
                          </div>
                        ))
                      ) : (
                        <p className="navbar-notification-empty">Aucune notification</p>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <Link to="/dashboard" className="navbar-notification-footer" onClick={() => setNotificationsOpen(false)}>
                        Voir tout
                      </Link>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="navbar-logout-btn"
                aria-label="Se déconnecter"
              >
                <LogOut size={18} className="navbar-logout-icon" strokeWidth={2} />
                <span className="navbar-logout-text">Déconnexion</span>
              </button>
            </div>
          </>
        ) : (
          <Link to="/login" className="navbar-login-btn">Connexion</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
