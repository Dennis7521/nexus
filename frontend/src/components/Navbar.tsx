import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { fetchNotificationCounts } from '../utils/notificationHelpers';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSkillsMenuOpen, setIsSkillsMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);
  
  // Check if current user is admin (only on admin routes)
  const isAdmin = location.pathname.startsWith('/admin') && localStorage.getItem('adminToken') !== null;

  // Fetch unread counts
  useEffect(() => {
    if (!user) return;
    if (isAdmin) return;

    const fetchUnreadCounts = async () => {
      const counts = await fetchNotificationCounts();
      setUnreadMessages(counts.unreadMessages);
      setUnreadRequests(counts.unreadRequests);
    };

    fetchUnreadCounts();
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    // Check if admin logout
    if (isAdmin) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      navigate('/admin');
    } else {
      logout();
      navigate('/login');
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full z-50 transition-transform duration-300 ease-in-out flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: '280px',
          background: 'var(--green-900)',
          boxShadow: '4px 0 12px rgba(0,0,0,0.2)'
        }}
      >
        <div className="p-6 flex-shrink-0">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold" style={{ color: 'var(--white)' }}>
              Menu
            </h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 transition-transform duration-200 hover:scale-110"
              aria-label="Close menu"
            >
              <span className="text-2xl" style={{ color: 'var(--white)' }}>×</span>
            </button>
          </div>

          {/* Main Navigation Links - Only show for students */}
          {!isAdmin && (
            <div className="flex flex-col space-y-2">
              <Link
                to="/matches"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg transition-all duration-200 hover:translate-x-2 ${
                  isActive('/matches') ? 'bg-green-700' : ''
                }`}
                style={{ color: 'var(--white)' }}
              >
                <span className="font-medium">Matches</span>
              </Link>

              {/* Skills Menu */}
              <div>
                <button
                  onClick={() => setIsSkillsMenuOpen(!isSkillsMenuOpen)}
                  className="w-full px-4 py-3 rounded-lg transition-all duration-200 hover:translate-x-2 flex items-center justify-between"
                  style={{ color: 'var(--white)' }}
                >
                  <span className="font-medium">Skills</span>
                  {isSkillsMenuOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                {/* Skills Submenu */}
                {isSkillsMenuOpen && (
                  <div className="ml-4 mt-2 space-y-2">
                    <Link
                      to="/create-skill"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-4 py-2 rounded-lg transition-all duration-200 hover:translate-x-2 ${
                        isActive('/create-skill') ? 'bg-green-700' : ''
                      }`}
                      style={{ color: 'var(--white)' }}
                    >
                      <span className="text-sm">Create Skill</span>
                    </Link>
                    <Link
                      to="/my-skills"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-4 py-2 rounded-lg transition-all duration-200 hover:translate-x-2 ${
                        isActive('/my-skills') ? 'bg-green-700' : ''
                      }`}
                      style={{ color: 'var(--white)' }}
                    >
                      <span className="text-sm">Manage Skills</span>
                    </Link>
                  </div>
                )}
              </div>

              <Link
                to="/transactions"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg transition-all duration-200 hover:translate-x-2 ${
                  isActive('/transactions') ? 'bg-green-700' : ''
                }`}
                style={{ color: 'var(--white)' }}
              >
                <span className="font-medium">Transactions</span>
              </Link>

              <Link
                to="/credit-store"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg transition-all duration-200 hover:translate-x-2 ${
                  isActive('/credit-store') ? 'bg-green-700' : ''
                }`}
                style={{ color: 'var(--white)' }}
              >
                <span className="font-medium">Credit Store</span>
              </Link>
            </div>
          )}
        </div>

        {/* Bottom Section - Sign Out */}
        <div className="mt-auto p-6 flex-shrink-0">
          {/* Sign Out Button */}
          <button
            onClick={() => {
              handleLogout();
              setIsMobileMenuOpen(false);
            }}
            className="w-full px-4 py-3 rounded-lg transition-all duration-200 hover:translate-x-2 hover:bg-green-700 flex items-center gap-2"
            style={{ color: 'var(--white)' }}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Navbar */}
      <nav style={{ 
        background: 'var(--green-800)', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)' 
      }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center py-8 relative">
            {/* Burger Menu and Logo - Left Side */}
            <div className="flex items-center gap-6">
              {/* Burger Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex flex-col gap-1.5 p-2 transition-transform duration-200 hover:scale-110"
                aria-label="Toggle menu"
              >
                <span 
                  className="block w-6 h-0.5 transition-all duration-300"
                  style={{ 
                    background: 'var(--white)',
                    transform: isMobileMenuOpen ? 'rotate(45deg) translateY(8px)' : 'none'
                  }}
                />
                <span 
                  className="block w-6 h-0.5 transition-all duration-300"
                  style={{ 
                    background: 'var(--white)',
                    opacity: isMobileMenuOpen ? 0 : 1
                  }}
                />
                <span 
                  className="block w-6 h-0.5 transition-all duration-300"
                  style={{ 
                    background: 'var(--white)',
                    transform: isMobileMenuOpen ? 'rotate(-45deg) translateY(-8px)' : 'none'
                  }}
                />
              </button>

              {/* Logo */}
              <Link to="/dashboard" className="flex items-center gap-6 transition-transform duration-200 hover:scale-105">
                <img 
                  src="/images/node.png" 
                  alt="NEXUS Logo" 
                  className="w-16 h-16 object-contain"
                />
                <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--white)' }}>
                  NEXUS
                </span>
              </Link>
            </div>

            {/* Navigation Links - Centered */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-12">
              {isAdmin ? (
                // Admin Navigation
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`nav-link transition-transform duration-200 hover:scale-110 ${isActive('/admin/dashboard') ? 'nav-link-active' : ''}`}
                  >
                    User Management
                  </Link>
                  <Link
                    to="/admin/user-reports"
                    className={`nav-link transition-transform duration-200 hover:scale-110 ${isActive('/admin/user-reports') ? 'nav-link-active' : ''}`}
                  >
                    User Reports
                  </Link>
                  <Link
                    to="/admin/reports"
                    className={`nav-link transition-transform duration-200 hover:scale-110 ${isActive('/admin/reports') ? 'nav-link-active' : ''}`}
                  >
                    Analytics
                  </Link>
                  <Link
                    to="/admin/session-monitor"
                    className={`nav-link transition-transform duration-200 hover:scale-110 ${isActive('/admin/session-monitor') ? 'nav-link-active' : ''}`}
                  >
                    Session Monitor
                  </Link>
                </>
              ) : (
                // Student Navigation
                <>
                  <Link
                    to="/dashboard"
                    className={`nav-link transition-transform duration-200 hover:scale-110 ${isActive('/dashboard') ? 'nav-link-active' : ''}`}
                  >
                    Home
                  </Link>
                  <Link
                    to="/browse"
                    className={`nav-link transition-transform duration-200 hover:scale-110 ${isActive('/browse') ? 'nav-link-active' : ''}`}
                  >
                    Browse
                  </Link>
                  <Link
                    to="/messages"
                    className={`nav-link transition-transform duration-200 hover:scale-110 ${isActive('/messages') ? 'nav-link-active' : ''} relative`}
                  >
                    Messages
                    {unreadMessages > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                        style={{ background: 'white' }}
                      />
                    )}
                  </Link>
                  <Link
                    to="/requests"
                    className={`nav-link transition-transform duration-200 hover:scale-110 ${isActive('/requests') ? 'nav-link-active' : ''} relative`}
                  >
                    Requests
                    {unreadRequests > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                        style={{ background: 'white' }}
                      />
                    )}
                  </Link>
                </>
              )}
            </div>

            {/* User Menu - Right Side (Only for students) */}
            {!isAdmin && (
              <div className="ml-auto">
                <Link
                  to="/profile"
                  className="flex items-center space-x-3 text-sm font-medium transition-all duration-200 hover:scale-105"
                  style={{ color: 'var(--white)' }}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm tracking-tight overflow-hidden"
                    style={{ 
                      background: 'var(--white)', 
                      color: 'var(--green-500)' 
                    }}
                  >
                    {user?.profilePictureUrl ? (
                      <img 
                        src={user.profilePictureUrl.includes('cloudinary.com') ? user.profilePictureUrl : user.profilePictureUrl.startsWith('http') ? new URL(user.profilePictureUrl).pathname : user.profilePictureUrl} 
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
                    )}
                  </div>
                  <span className="hidden md:block">
                    {user?.firstName} {user?.lastName}
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};
