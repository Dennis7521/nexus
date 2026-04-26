import { useState, useEffect } from 'react';
import { Search, UserX, Trash2, AlertCircle, CheckCircle, XCircle, UserPlus, Shield } from 'lucide-react';
import { useToast, ToastContainer } from '../components/Toast';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  student_id: string;
  created_at: string;
  is_suspended: boolean;
  profile_picture_url?: string;
}

export const Admin: React.FC = () => {
  const { toasts, success, error, removeToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  // Fetch all users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        error('Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      error('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendAccount = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/suspend-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          suspend: !selectedUser.is_suspended
        })
      });

      if (response.ok) {
        const action = selectedUser.is_suspended ? 'reactivated' : 'suspended';
        success(`Account ${action} for ${selectedUser.first_name} ${selectedUser.last_name}`);
        setShowSuspendModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const data = await response.json();
        error(data.error || 'Failed to update account status');
      }
    } catch (err) {
      console.error('Error updating account:', err);
      error('Error updating account status');
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id
        })
      });
      
      if (response.ok) {
        success(`Account deleted for ${selectedUser.first_name} ${selectedUser.last_name}`);
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        const data = await response.json();
        error(data.error || 'Failed to delete account');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      error('Error deleting account');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (adminPassword !== adminConfirmPassword) {
      error('Passwords do not match');
      return;
    }

    if (adminPassword.length < 6) {
      error('Password must be at least 6 characters');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });

      const data = await response.json();

      if (response.ok) {
        success(`Admin account created: ${adminUsername}`);
        setAdminUsername('');
        setAdminPassword('');
        setAdminConfirmPassword('');
      } else {
        error(data.error || 'Failed to create admin account');
      }
    } catch (err) {
      console.error('Error creating admin:', err);
      error('Error creating admin account');
    }
  };

  const filteredUsers = users.filter(user => 
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ background: 'var(--green-50)', minHeight: '100vh' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--green-900)' }}>
            Admin Portal
          </h1>
          <p style={{ color: 'var(--gray-600)' }}>
            Manage user accounts, password recovery, and account moderation
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-2xl">
            <Search 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5" 
              style={{ color: 'var(--gray-400)' }}
            />
            <input
              type="text"
              placeholder="Search by name, email, or student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg"
              style={{
                background: 'var(--white)',
                border: '1px solid var(--gray-300)',
                color: 'var(--gray-900)'
              }}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div 
            className="p-6 rounded-lg"
            style={{ 
              background: 'var(--white)',
              border: '1px solid var(--gray-200)'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--gray-600)' }}>
                  Total Users
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: 'var(--green-800)' }}>
                  {users.length}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="p-6 rounded-lg"
            style={{ 
              background: 'var(--white)',
              border: '1px solid var(--gray-200)'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--gray-600)' }}>
                  Active Users
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: 'var(--green-800)' }}>
                  {users.filter(u => !u.is_suspended).length}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="p-6 rounded-lg"
            style={{ 
              background: 'var(--white)',
              border: '1px solid var(--gray-200)'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--gray-600)' }}>
                  Suspended Users
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: 'var(--red)' }}>
                  {users.filter(u => u.is_suspended).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Admin Form */}
        <div 
          className="rounded-lg p-8 mb-8"
          style={{ 
            background: 'var(--white)',
            border: '1px solid var(--gray-200)'
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--white)', border: '1px solid var(--gray-200)' }}
            >
              <UserPlus className="w-6 h-6" style={{ color: 'var(--green-800)' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--gray-900)' }}>
                Create New Admin Account
              </h2>
              <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                Add a new administrator to the system
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-700)' }}>
                Admin Username
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--gray-300)',
                  color: 'var(--gray-900)'
                }}
                placeholder="Enter admin username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-700)' }}>
                Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--gray-300)',
                  color: 'var(--gray-900)'
                }}
                placeholder="Min 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--gray-700)' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={adminConfirmPassword}
                onChange={(e) => setAdminConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  border: '1px solid var(--gray-300)',
                  color: 'var(--gray-900)'
                }}
                placeholder="Confirm password"
              />
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                className="px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                style={{
                  background: 'var(--green-800)',
                  color: 'var(--white)'
                }}
              >
                <Shield className="w-5 h-5" />
                Create Admin Account
              </button>
            </div>
          </form>
        </div>

        {/* Users Table */}
        <div 
          className="rounded-lg overflow-hidden"
          style={{ 
            background: 'var(--white)',
            border: '1px solid var(--gray-200)'
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'var(--gray-50)' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--gray-700)' }}>
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--gray-700)' }}>
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--gray-700)' }}>
                    Student ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--gray-700)' }}>
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: 'var(--gray-700)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center" style={{ color: 'var(--gray-500)' }}>
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center" style={{ color: 'var(--gray-500)' }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr 
                      key={user.id}
                      style={{ 
                        borderTop: index > 0 ? '1px solid var(--gray-200)' : 'none'
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                            style={{ 
                              background: 'var(--green-500)',
                              color: 'var(--white)'
                            }}
                          >
                            {user.profile_picture_url ? (
                              <img 
                                src={user.profile_picture_url} 
                                alt={`${user.first_name} ${user.last_name}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium">
                                {user.first_name[0]}{user.last_name[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: 'var(--gray-900)' }}>
                              {user.first_name} {user.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4" style={{ color: 'var(--gray-700)' }}>
                        {user.email}
                      </td>
                      <td className="px-6 py-4" style={{ color: 'var(--gray-700)' }}>
                        {user.student_id}
                      </td>
                      <td className="px-6 py-4">
                        {user.is_suspended ? (
                          <span 
                            className="px-3 py-1 text-sm font-medium inline-flex items-center gap-1"
                            style={{ 
                              color: 'var(--red)'
                            }}
                          >
                            <XCircle className="w-4 h-4" />
                            Suspended
                          </span>
                        ) : (
                          <span 
                            className="px-3 py-1 text-sm font-medium inline-flex items-center gap-1"
                            style={{ 
                              color: 'var(--green-800)'
                            }}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowSuspendModal(true);
                            }}
                            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                            style={{ 
                              color: user.is_suspended ? 'var(--green-800)' : 'var(--warning)',
                              border: '1px solid var(--gray-300)'
                            }}
                            title={user.is_suspended ? 'Reactivate Account' : 'Suspend Account'}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
                            style={{ 
                              color: 'var(--red)',
                              border: '1px solid var(--gray-300)'
                            }}
                            title="Delete Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Suspend Account Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-lg max-w-md w-full p-6"
            style={{ background: 'var(--white)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: selectedUser.is_suspended ? 'var(--green-100)' : 'var(--warning-light)' }}
              >
                <AlertCircle className="w-6 h-6" style={{ color: selectedUser.is_suspended ? 'var(--green-800)' : 'var(--warning)' }} />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--gray-900)' }}>
                  {selectedUser.is_suspended ? 'Reactivate Account' : 'Suspend Account'}
                </h3>
                <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                  {selectedUser.first_name} {selectedUser.last_name}
                </p>
              </div>
            </div>

            <p className="mb-6" style={{ color: 'var(--gray-700)' }}>
              {selectedUser.is_suspended 
                ? 'Are you sure you want to reactivate this account? The user will regain access to the platform.'
                : 'Are you sure you want to suspend this account? The user will lose access to the platform.'}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: 'var(--gray-200)',
                  color: 'var(--gray-700)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendAccount}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: selectedUser.is_suspended ? 'var(--green-500)' : 'var(--warning)',
                  color: 'var(--white)'
                }}
              >
                {selectedUser.is_suspended ? 'Reactivate' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="rounded-lg max-w-md w-full p-6"
            style={{ background: 'var(--white)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'var(--red-light)' }}
              >
                <Trash2 className="w-6 h-6" style={{ color: 'var(--red)' }} />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--gray-900)' }}>
                  Delete Account
                </h3>
                <p className="text-sm" style={{ color: 'var(--gray-600)' }}>
                  {selectedUser.first_name} {selectedUser.last_name}
                </p>
              </div>
            </div>

            <p className="mb-6" style={{ color: 'var(--gray-700)' }}>
              Are you sure you want to permanently delete this account? This action cannot be undone and all user data will be removed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: 'var(--gray-200)',
                  color: 'var(--gray-700)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  background: 'var(--red)',
                  color: 'var(--white)'
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
