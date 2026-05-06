import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FolderKanban, CheckSquare, LogOut, Menu, ShieldCheck, UserCog, ChevronUp, Bell } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/my-tasks', icon: CheckSquare, label: 'My Tasks' }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      // silent fail
    }
  }

  async function handleNotificationClick(notif) {
    if (!notif.read) {
      await api.put(`/notifications/${notif.id}/read`);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setShowNotifications(false);
    if (notif.link) {
      navigate(notif.link);
    }
  }

  async function handleMarkAllRead() {
    await api.put('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  async function handleTransferAdmin(email) {
    try {
      await api.post('/auth/transfer-admin', { email });
      toast.success('Admin role transferred. You will be logged out.');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Transfer failed');
    }
  }

  async function handleHostAdmin(email) {
    try {
      const { data } = await api.post('/auth/host-admin', { email });
      toast.success(data.message);
      setShowHostModal(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add admin');
    }
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-bold text-lg text-gray-900">TaskPilot</span>
            </div>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bell size={18} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h4 className="font-semibold text-sm text-gray-900">Notifications</h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No notifications</p>
                    ) : (
                      notifications.map(notif => (
                        <button
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                            !notif.read ? 'bg-brand-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                            )}
                            <div className={!notif.read ? '' : 'ml-4'}>
                              <p className="text-sm text-gray-700">{notif.message}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {formatNotifTime(notif.createdAt)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User profile section */}
        <div className="p-4 border-t border-gray-100 relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                isAdmin
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {user?.role || 'MEMBER'}
              </span>
            </div>
            <ChevronUp size={16} className={`text-gray-400 transition-transform ${showUserMenu ? '' : 'rotate-180'}`} />
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              {isAdmin && (
                <>
                  <button
                    onClick={() => { setShowTransferModal(true); setShowUserMenu(false); }}
                    className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm hover:bg-gray-50 transition-colors"
                  >
                    <UserCog size={16} className="text-orange-500" />
                    <div>
                      <p className="font-medium text-gray-900">Change Admin</p>
                      <p className="text-xs text-gray-400">Transfer your admin role</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setShowHostModal(true); setShowUserMenu(false); }}
                    className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm hover:bg-gray-50 transition-colors"
                  >
                    <ShieldCheck size={16} className="text-brand-500" />
                    <div>
                      <p className="font-medium text-gray-900">Host Admin</p>
                      <p className="text-xs text-gray-400">Add co-admin (max 3)</p>
                    </div>
                  </button>
                  <hr className="my-1" />
                </>
              )}
              <button
                onClick={() => { handleLogout(); setShowUserMenu(false); }}
                className="flex items-center gap-3 px-4 py-2.5 w-full text-left text-sm hover:bg-red-50 transition-colors text-red-600"
              >
                <LogOut size={16} />
                <p className="font-medium">Logout</p>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 border-b border-gray-200 bg-white">
          <button onClick={() => setSidebarOpen(true)} className="p-1">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-gray-900">TaskPilot</span>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Transfer Admin Modal */}
      {showTransferModal && (
        <TransferAdminModal
          onClose={() => setShowTransferModal(false)}
          onTransfer={handleTransferAdmin}
        />
      )}

      {/* Host Admin Modal */}
      {showHostModal && (
        <HostAdminModal
          onClose={() => setShowHostModal(false)}
          onHost={handleHostAdmin}
        />
      )}
    </div>
  );
}

function TransferAdminModal({ onClose, onTransfer }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setLoading(true);
    await onTransfer(email);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Change Admin</h2>
        <p className="text-sm text-gray-500 mb-4">
          Transfer your admin role to another user. You will be logged out after this action.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New admin's email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setConfirmed(false); }}
              className="input-field"
              placeholder="newadmin@example.com"
              required
              autoFocus
            />
          </div>

          {confirmed && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-700 font-medium">Are you sure?</p>
              <p className="text-xs text-orange-600 mt-1">
                This will remove your admin access and log you out immediately.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              disabled={loading || !email}
              className={confirmed ? 'btn-danger' : 'btn-primary'}
            >
              {loading ? 'Transferring...' : confirmed ? 'Confirm Transfer' : 'Transfer Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HostAdminModal({ onClose, onHost }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    await onHost(email);
    setEmail('');
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Host Admin</h2>
        <p className="text-sm text-gray-500 mb-4">
          Grant admin access to another user. Maximum 3 admins allowed per project.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User's email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="teammate@example.com"
              required
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">They must have a TaskPilot account</p>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading || !email} className="btn-primary">
              {loading ? 'Granting...' : 'Grant Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatNotifTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
