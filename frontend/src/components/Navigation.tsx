import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notification.service';
import { AppNotification } from '../types/notification';

export function Navigation() {
  const { user, userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user) return;

    // Fetch in-app notifications
    getUserNotifications(user.uid)
      .then((data) => setNotifications(data))
      .catch((err) => console.warn('Failed to load notifications:', err));
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleMarkAsRead = async (notifId: string, complaintId: string) => {
    try {
      await markNotificationAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
      );
      setNotifDrawerOpen(false);
      navigate(`/complaints/${complaintId}`);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const role = userProfile?.role || 'student';

  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand & Main Nav */}
        <div className="flex items-center space-x-4 md:space-x-6">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-md group-hover:scale-105 transition-transform">
              S
            </div>
            <div>
              <span className="font-bold text-slate-50 text-base block leading-tight">
                Smart Complaint System
              </span>
              <span className="text-[11px] text-slate-400 font-mono">PS-06 Campus Care</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {role === 'student' && (
              <>
                <Link
                  to="/student"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/student')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  Overview
                </Link>
                <Link
                  to="/complaints"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/complaints')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  My Complaints
                </Link>
              </>
            )}

            {role === 'department_staff' && (
              <Link
                to="/department"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/department')
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                Department Queue
              </Link>
            )}

            {role === 'admin' && (
              <>
                <Link
                  to="/admin"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/complaints"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/complaints')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  Master List
                </Link>
                <Link
                  to="/admin/analytics"
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/admin/analytics')
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  Analytics & Patterns
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Right Actions, Notifications & Profile */}
        <div className="flex items-center space-x-3">
          {/* Submit Button for Students */}
          {role === 'student' && (
            <Link
              to="/complaints/new"
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-lg shadow-md transition-all flex items-center space-x-1.5 hover:scale-105 active:scale-95"
            >
              <span>+ Submit Complaint</span>
            </Link>
          )}

          {/* Notification Bell Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
              className="p-2 text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 rounded-lg transition-colors relative"
              aria-label="View notifications"
            >
              <span className="text-base">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Drawer */}
            {notifDrawerOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in">
                <div className="p-3 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-100 text-xs">In-App Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 text-[10px] font-mono font-bold">
                        {unreadCount} Unread
                      </span>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/60 text-xs">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">No notifications available.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkAsRead(n.id, n.complaintId)}
                        className={`p-3 cursor-pointer transition-colors space-y-1 ${
                          n.read
                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                            : 'bg-indigo-950/40 text-slate-100 font-medium hover:bg-indigo-950/60 border-l-2 border-indigo-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{n.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Badge */}
          <div className="hidden sm:block text-right">
            <div className="text-xs font-bold text-slate-100">{userProfile?.name}</div>
            <div className="text-[10px] text-indigo-400 font-mono">
              {userProfile?.role}
              {userProfile?.department ? ` (${userProfile.department})` : ''}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-600"
          >
            Logout
          </button>

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-300 hover:text-white rounded-lg bg-slate-700/50"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-700 px-4 py-3 space-y-2 text-sm">
          {role === 'student' && (
            <>
              <Link
                to="/student"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-200 hover:text-indigo-300 font-medium"
              >
                Overview
              </Link>
              <Link
                to="/complaints"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-200 hover:text-indigo-300 font-medium"
              >
                My Complaints
              </Link>
              <Link
                to="/complaints/new"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-indigo-400 font-bold"
              >
                + Submit New Complaint
              </Link>
            </>
          )}

          {role === 'department_staff' && (
            <Link
              to="/department"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-slate-200 hover:text-indigo-300 font-medium"
            >
              Department Queue
            </Link>
          )}

          {role === 'admin' && (
            <>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-200 hover:text-indigo-300 font-medium"
              >
                Admin Analytics
              </Link>
              <Link
                to="/admin/complaints"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-200 hover:text-indigo-300 font-medium"
              >
                Master Complaint List
              </Link>
              <Link
                to="/admin/analytics"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-200 hover:text-indigo-300 font-medium"
              >
                Analytics & Patterns
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export default Navigation;
